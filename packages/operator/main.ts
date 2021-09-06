import { IApplicationModel, KV, KVString } from '@yam/types'
import * as fs from 'fs-extra'
import * as yaml from 'js-yaml'
import * as path from 'path'
import { APP_MODEL_FILES, YAM_PREFIX } from './constants'
import YamApplyContext from './context/apply'
import YamEngine from './engine'
import YamPluginComposer, { MergedHandler } from './engine/composer'
import KubernetesOperatorClient from './kube/kube-client'
import TemplateRender from './template/render'
import type { KubernetesEnvironment, OperatorParam } from './types'
import { createLogger } from './util'

/**
 * MainOperator implements the major workflow of YAM runtime
 */
export class MainOperator {

  private yamEngine: YamEngine

  private templateRender = new TemplateRender()
  private kubeClient: KubernetesOperatorClient
  private pluginComposer = new YamPluginComposer()

  private jsonSchema: unknown
  private handlers: MergedHandler[]

  private log = createLogger('main')

  /**
   * The core operation process, cli will build parameters and call operate method
   */
  public async operate(param: OperatorParam): Promise<void> {
    if (param.clusters.length === 0) {
      this.log.info('you are using the most secure way -- deploy nowhere')
      return
    }
    const timestamp = Date.now()
    this.log.info('operation process started...')

    // a. initialize kubernetes client and YAM engine
    this.kubeClient = await KubernetesOperatorClient.create(param.clusters)
    this.yamEngine = new YamEngine(this.templateRender, param, this.kubeClient)


    // b. read YAM definition
    const yamPath = this.checkApplicationModelPath(param.workingDir)
    const yamObj = await this.templateRender.loadYaml(param.workingDir, yamPath) as IApplicationModel
    if (!yamObj || !yamObj.schema) {
      throw new Error('can not resolve "schema" filed in YAM file')
    }
    this.log.info(`plan to sync operation model for component: ${yamObj.metadata.namespace}/${yamObj.metadata.app}`)

    // c. merge plugin schema to build final json schema
    const schemaHandlers = await this.pluginComposer.compose(param.engine.plugins, param.workingDir, yamObj)
    this.jsonSchema = schemaHandlers.jsonSchema
    this.handlers = schemaHandlers.handlers

    // d. read dynamic values from 'values/' directory
    const customizedValues = await this.templateRender.readCustomizedValues(param.workingDir, param.cmdParams, param.clusters, yamObj)

    // e. plan and apply changes for each environment
    for (const cluster of param.clusters) {
      this.kubeClient.setCurrentContext(cluster)
      const customizedVal = customizedValues.get(cluster.name) || {}
      this.log.info(`processing environment [${cluster.envTag}] of stack [${cluster.stack}], got ${Object.keys(customizedVal).length} dynamic parameters.`)
      await this.planApply(param, cluster, customizedVal)
    }
    this.log.info(`operation process finished, cost ${(Date.now() - timestamp) / 1000}s`)
  }

  /**
   * Plan-Apply is the abstraction of an operation process, by different CLI command, engine runs in different mode
   * plan-only  mode: "yam plan -v -c ..."
   * apply-only mode: "yam apply -f <file|url>"
   * plan-apply mode: "yam apply -version --clusters ..."
   * 
   * NOTE: running in 'apply-only' mode will still execute plan stage functions, but using the binary plan file.
   */
  private async planApply(param: OperatorParam, cluster: KubernetesEnvironment, customizedVal: KV): Promise<void> {
    // a. render current application model
    const yamPath = this.checkApplicationModelPath(param.workingDir)
    const current = await this.templateRender.renderTemplate(param.workingDir, yamPath, true, customizedVal)
    const currentYam = yaml.load(current) as IApplicationModel
    this.log.info(`application model of [${currentYam.metadata.namespace}/${currentYam.metadata.app}] rendered with dynamic parameters.`)

    // b. find previous application model
    let previousMap = {} as KVString
    if (!param.noDiff) {
      previousMap = await this.kubeClient.getConfig({ name: YAM_PREFIX + currentYam.metadata.app })
    } else {
      this.log.info(`running in no-diff mode, will replay all actions.`)
    }
    let previousYam = { schema: currentYam.schema, metadata: currentYam.metadata }
    if (previousMap[yamPath]) {
      this.log.info('previous application model fetched')
      previousYam = yaml.load(previousMap[yamPath]) as IApplicationModel
    }

    // c. star Plan stage, pass the YAM data, and final merged json schema and operation handlers
    const planCtx = await this.yamEngine.plan(previousYam, currentYam, this.jsonSchema, this.handlers, cluster, customizedVal)

    // d. start Apply Stage
    if (param.runMode !== "plan-only") {
      const executeCtx = new YamApplyContext(this.kubeClient, !!param.dryRunMode)
      await this.yamEngine.apply(param, planCtx, executeCtx)
    }
  }

  /**
   * Checking if 'app.yaml, yam.yaml' like files exists
   */
  private checkApplicationModelPath(workDir: string) {
    for (const name of APP_MODEL_FILES) {
      if (fs.existsSync(path.join(workDir, name))) {
        return name
      }
    }
    throw new Error('no app.yaml or yam.yaml files found in directory ' + workDir)
  }
}
