import type { DiffResult, ExecuteContext, IApplicationModel, KV, PlanContext, PlanContextData } from '@yam/types'
import YamPlanContext from '../context/plan'
import TemplateRender from '../template/render'
import type { KubernetesEnvironment, OperatorParam } from '../types'
import Locker from './locker'
import { MergedHandler } from './schema'
import Store from './store'

export default class YamEngine {

  private templateRender
  private locker = new Locker()
  private store = new Store()

  constructor(templateRender: TemplateRender) {
    this.templateRender = templateRender
  }

  /**
   * Plan Stage
   */
  public async plan(
    param: OperatorParam, prev: IApplicationModel, current: IApplicationModel, jsonSchema: unknown,
    handlers: MergedHandler[], cluster: KubernetesEnvironment, customizedValues: KV
  ): Promise<YamPlanContext> {
    // YAM data validation with final json schema

    // calculate diff TODO
    const jsonDiff: DiffResult[] = []

    // build run context
    const planContextData: PlanContextData = {
      actions: [],

      allDiffResults: jsonDiff,
      currentModelFull: current,
      previousModelFull: prev,

      // All merged dynamic parameters for template rendering
      customizedValues,

      variables: param.engine.variables,

      workingDir: param.workingDir,
      stackName: cluster.stack,
      environmentName: cluster.name,
    }
    // walk object
    const WALK_OBJ_ROOT = ''
    const planContext = new YamPlanContext(this.templateRender, planContextData)
    await this.walkObjectAndPlan(planContext, current, WALK_OBJ_ROOT, handlers)

    // TODO, record prompt selections to variables, persist plan to binary
    return planContext
  }

  /**
   * Apply Stage
   */
  public async apply(param: OperatorParam, planCtx: PlanContext, executeCtx: ExecuteContext): Promise<void> {
    const lockObj = await this.locker.lock(param)
    try {
      for (const action of planCtx.data.actions) {
        await action(executeCtx)
      }
    } finally {
      await this.locker.unlock(param, lockObj)
      await this.store.storeResult(param)
    }
  }

  private async walkObjectAndPlan(planCtx: YamPlanContext, current: KV, jsonPath: string, handlers: MergedHandler[]) {
    // TODO
    for (const key in current) {
      const tmpJsonPath = jsonPath + '.' + key
      const matched = handlers.find((h) => h.matcher === tmpJsonPath)
      if (matched) {
        for (const handler of matched.handlers) {
          planCtx.log.info(`start planning: ${handler.pluginName} for declarations on: ${tmpJsonPath}`)
        }
      }

      const isArr = current[key] instanceof Array
      if (isArr) {
        // TODO
      } else if (typeof current[key] === "object") {
        await this.walkObjectAndPlan(planCtx, current[key] as KV, tmpJsonPath, handlers)
      }
    }
  }
}