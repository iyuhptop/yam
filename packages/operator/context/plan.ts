import type { Action, IApplicationModel, PlanContext, PlanContextData } from "@yam/types"
import * as lodash from 'lodash'
import TemplateRender from "../template/render"
import { createLogger } from "../util"

/**
 * Plan stage context data and methods, used by plugins
 */
export default class YamPlanContext implements PlanContext {

  data: PlanContextData

  log = createLogger('plan')

  _ = lodash

  private templateRender: TemplateRender

  constructor(templateRender: TemplateRender, data: PlanContextData) {
    this.templateRender = templateRender
    this.data = data
  }

  action(...actions: Action[]): void {
    this.data.actions.push(...actions)
  }

  async prompt<T>(text: string, defaultVal: T): Promise<T> {
    this.log.debug('prompt msg')
    // TODO
    // add prompt result into variables, this.data.variables.set()
    return defaultVal
  }

  async renderTemplate(relativePath: string, handleInclude: boolean): Promise<string> {
    return this.templateRender.renderTemplate(this.data.workingDir, relativePath, handleInclude, this.data.customizedValues)
  }
}