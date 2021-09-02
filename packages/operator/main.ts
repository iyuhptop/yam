import { IApplicationModel } from '@yam/types'
import axios from 'axios'
import * as fs from 'fs-extra'
import * as yaml from 'js-yaml'
import * as path from 'path'
import { APP_MODEL_FILES, YAM_PREFIX } from './constants'
import YamApplyContext from './context/apply'
import YamEngine from './engine'
import PluginSchemaHandler from './engine/schema'
import KubernetesOperatorClient from './kube/kube-client'
import TemplateRender from './template/render'
import type { OperatorParam } from './types'
import { createLogger } from './util'

/**
 * MainOperator is the core implement of YAM engine
 */
export class MainOperator {

  private log = createLogger('main')
  private templateRender = new TemplateRender()
  private kubeClient: KubernetesOperatorClient
  private pluginSchemaHandler = new PluginSchemaHandler()
  private yamEngine = new YamEngine(this.templateRender)

  async operate(param: OperatorParam) {
    if (param.clusters.length === 0) {
      this.log.info('you are using the most secure way -- deploy nowhere')
      return
    }
    this.log.info('start operation process')

    // 1. read YAM definition
    const yamPath = this.checkApplicationModelPath(param.workingDir)
    const yamObj = await this.templateRender.loadYaml(param.workingDir, yamPath) as IApplicationModel
    if (!yamObj || !yamObj.schema) {
      throw new Error('can not resolve "schema" filed in YAM file')
    }

    // 2. merge plugin schema to build final json schema
    const { jsonSchema, handlers } = await this.pluginSchemaHandler.buildSchemaAndHandlers(param.engine.plugins, param.workingDir, yamObj)

    // 3. read dynamic values from 'values/' directory
    const customizedValues = await this.templateRender.readCustomizedValues(param.workingDir, param.cmdParams, param.clusters, yamObj)

    // 4. initialize kubernetes client
    this.kubeClient = await KubernetesOperatorClient.create(param.clusters)

    // 5. plan and apply one by one
    for (const cluster of param.clusters) {

      // 5.a. render current model and find previous model
      const customizedVal = customizedValues.get(cluster.name) || {}
      const current = await this.templateRender.renderTemplate(param.workingDir, yamPath, true, customizedVal)
      const previousMap = await this.kubeClient.getConfig({ name: YAM_PREFIX + yamObj.metadata.app })
      const currentYam = yaml.load(current) as IApplicationModel
      const previousYam = previousMap[yamPath] ?
        (yaml.load(previousMap[yamPath]) as IApplicationModel) : { schema: currentYam.schema, metadata: currentYam.metadata }

      // 5.b. star Plan stage, pass the YAM data, and final merged json schema and operation handlers
      const planCtx = await this.yamEngine.plan(param, previousYam, currentYam, jsonSchema, handlers, cluster, customizedVal)

      // 5.c. start Apply Stage
      if (!param.onlyPlan) {
        const executeCtx = new YamApplyContext(this.kubeClient, axios, param.dryRunMode)
        await this.yamEngine.apply(param, planCtx, executeCtx)
      }
    }
  }

  private checkApplicationModelPath(workDir: string) {
    for (const name of APP_MODEL_FILES) {
      if (fs.existsSync(path.join(workDir, name))) {
        return name
      }
    }
    throw new Error('no app.yaml or yam.yaml files found in directory ' + workDir)
  }
}
