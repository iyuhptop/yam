import type { DiffResult, ExecuteContext, IApplicationModel, KV, PlanContext, PlanContextData } from '@yam/types'
import YamPlanContext from '../context/plan'
import TemplateRender from '../template/render'
import type { KubernetesEnvironment, OperatorParam } from '../types'
import { createLogger, normalizeJsonPath } from '../util'
import YamStateLocker from './locker'
import { MergedHandler } from './composer'
import YamStateStore from './store'
import { JSONPath } from 'jsonpath-plus'
import ajv from 'ajv'

/**
 * YAM engine core, implement Plan & Apply process
 */
export default class YamEngine {

  private templateRender: TemplateRender
  private operatorParam: OperatorParam
  private store: YamStateStore
  private locker: YamStateLocker

  private log = createLogger("yam-engine")

  constructor(templateRender: TemplateRender, operatorParam: OperatorParam) {
    this.templateRender = templateRender
    this.operatorParam = operatorParam
    this.store = new YamStateStore(operatorParam)
    this.locker = new YamStateLocker(operatorParam)
  }

  /**
   * Plan Stage, calculate diff and apply each operation handler of plugins if JSON path matched
   */
  public async plan(
    prev: IApplicationModel, current: IApplicationModel, jsonSchema: unknown,
    handlers: MergedHandler[], cluster: KubernetesEnvironment, customizedValues: KV
  ): Promise<YamPlanContext> {
    // YAM data validation with final json schema
    this.validateJsonSchema(current, jsonSchema)

    // create Plan stage context instance
    const planContextData: PlanContextData = {
      actions: [],
      currentModelFull: current,
      previousModelFull: prev,
      // dynamic parameters for template rendering
      customizedValues,
      // configured default variabled and prompted variables
      variables: this.operatorParam.engine.variables,
      workingDir: this.operatorParam.workingDir,
      stackName: cluster.stack,
      environmentName: cluster.name,
      runMode: this.operatorParam.runMode
    }

    // query by each JSON path defined in plugins, call coresponding operate functions
    const planContext = new YamPlanContext(this.templateRender, planContextData)
    await this.matchJsonPathAndCallOperate(planContext, handlers)

    // store the planned binary file to local or/and cloud
    await this.store.persistPlan(planContext)
    return planContext
  }

  /**
   * Apply Stage, lock and call actions
   */
  public async apply(param: OperatorParam, planCtx: PlanContext, executeCtx: ExecuteContext): Promise<void> {
    const lockObj = await this.locker.lock(param)
    try {
      for (const action of planCtx.data.actions) {
        await action(executeCtx)
      }
    } finally {
      await this.locker.unlock(param, lockObj)
      await this.store.storeResult()
    }
  }

  private async matchJsonPathAndCallOperate(planCtx: YamPlanContext, jsonPathHandlers: MergedHandler[]) {
    for (const matchedHandler of jsonPathHandlers) {
      const jsonPath = normalizeJsonPath(matchedHandler.matcher)
      const partialCurrent = JSONPath({ path: jsonPath, json: planCtx.data.currentModelFull })
      const partialPrevious = JSONPath({ path: jsonPath, json: planCtx.data.previousModelFull })
      this.log.debug(`fetch JSON path: ${jsonPath}`, partialCurrent, partialPrevious)

      // calculate diff, allow lazy
      const diff = this.jsonDiff(partialPrevious, partialCurrent)

      // call operate function of all plugins to compose the plan stage
      for (const operateFunction of matchedHandler.handlers) {
        this.log.info(`planning operations, by: ${operateFunction.pluginName}`)
        await operateFunction.func(planCtx, partialCurrent, diff)
        this.log.info(`plan stage complete for ${operateFunction.pluginName}, total actions: ${planCtx.data.actions.length}.`)
      }
    }
  }

  private validateJsonSchema(current: IApplicationModel, jsonSchema: unknown): void {
    // TODO
    throw new Error('Method not implemented.')
  }


  private jsonDiff(prev: unknown, current: unknown): DiffResult {
    // todo
    return {} as DiffResult
  }

}