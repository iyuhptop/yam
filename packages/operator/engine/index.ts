import type { BasicType, DiffResult, ExecuteContext, IApplicationModel, KV, PlanContext, PlanContextData } from '@yam/types'
import * as yaml from 'js-yaml'
import { JSONPath } from 'jsonpath-plus'
import * as _ from 'lodash'
import * as hasher from 'object-hash'
import YamPlanContext from '../context/plan'
import TemplateRender from '../template/render'
import type { KubernetesEnvironment, OperatorParam } from '../types'
import { createLogger, normalizeJsonPath, validateJsonSchema } from '../util'
import { MergedHandler } from './composer'
import YamStateLocker from './locker'
import YamStateStore from './store'

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
    this.log.info('============== Plan Stage Start ==============')
    // YAM data validation with final json schema
    const errors = validateJsonSchema(current, jsonSchema)
    if (errors) {
      this.log.error("schema check didn't pass", errors)
      throw new Error('application model is not valid.')
    } else {
      this.log.info('schema check passed, application model definition is valid.')
    }

    // create Plan stage context instance
    const planContextData: PlanContextData = {
      actions: [],
      currentModelFull: current,
      previousModelFull: prev,
      // dynamic parameters for template rendering
      customizedValues,
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
    this.log.info('============== Plan Stage End ==============')
    return planContext
  }

  /**
   * Apply Stage, lock and call actions
   */
  public async apply(param: OperatorParam, planCtx: PlanContext, executeCtx: ExecuteContext): Promise<void> {
    const lockObj = await this.locker.lock(param)
    try {
      this.log.info('============== Apply Stage Start ==============')
      for (const action of planCtx.data.actions) {
        await action(executeCtx)
      }
      this.log.info('============== Apply Stage End ==============')
    } finally {
      await this.locker.unlock(param, lockObj)
      await this.store.storeResult()
    }
  }

  private async matchJsonPathAndCallOperate(planCtx: YamPlanContext, jsonPathHandlers: MergedHandler[]) {
    for (const matchedHandler of jsonPathHandlers) {
      const jsonPath = normalizeJsonPath(matchedHandler.matcher)
      const partialCurrent = JSONPath({ path: jsonPath, json: planCtx.data.currentModelFull }) || []
      const partialPrevious = JSONPath({ path: jsonPath, json: planCtx.data.previousModelFull }) || []
      this.log.info(`fetch and diff partial objects of JSON path '${matchedHandler.matcher}'`)

      const diff = this.calculateDiff(partialPrevious, partialCurrent)

      // call operate function of all plugins to compose the plan stage
      for (const operateFunction of matchedHandler.handlers) {
        this.log.info(`calling plugin [${operateFunction.pluginName}]`)
        const actionCnt = planCtx.data.actions.length
        await operateFunction.func(planCtx, partialCurrent, diff)
        this.log.info(`plugin [${operateFunction.pluginName}] handled, [${planCtx.data.actions.length - actionCnt}] actions appended.`)
      }
    }
  }

  private calculateDiff(previous: unknown[], current: unknown[]): DiffResult<unknown> {
    const currentMap = this.convertSelectedItemsToMap(current)
    const previousMap = this.convertSelectedItemsToMap(previous)

    const diff: DiffResult<unknown> = {
      hasDiff: false,

      hasNew: false,
      hasDeleted: false,
      hasModified: false,

      newItems: [],
      deletedItems: [],
      modifiedItems: []
    }
    currentMap.forEach((val, key) => {
      if (!previousMap.has(key)) {
        diff.hasNew = true
        this.log.info(`new item detected, identitfier: ${key}`)
      } else {
        if (!_.isEqual(val, previousMap.get(key))) {
          diff.hasModified = true
          this.log.info(`modified item detected, identitfier: ${key}`)
        }
        previousMap.delete(key)
      }
    })
    previousMap.forEach((val, key) => {
      diff.hasDeleted = true
      diff.deletedItems.push(val)
      this.log.info(`deleted item detected, identitfier: ${key}`)
    })
    diff.hasDiff = diff.hasDeleted || diff.hasNew || diff.hasModified
    return diff
  }

  private convertSelectedItemsToMap(arr: unknown[]): Map<string, KV | BasicType> {
    const result = new Map<string, KV | BasicType>()
    for (const index in arr) {
      const item = arr[index]
      if (item instanceof Array) {
        throw new Error(`nested array not allowed: \n${yaml.dump(item)}`)
      }
      if (typeof item === "object") {
        const hashKey = (item as KV).name as string || hasher(item)
        result.set(hashKey, item as KV)
      } else {
        // basic types, put index as map key
        result.set("#" + index, item as BasicType)
      }
    }
    return result
  }

}