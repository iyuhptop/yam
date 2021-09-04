import type { Action, PlanContext, PlanContextData } from "@yam/types"
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

  /**
   * Append function to operation action queue
   * 
   * @param actions the functions that need to be executed during 'apply' stage
   */
  action(...actions: Action[]): void {
    this.data.actions.push(...actions)
    actions.forEach((action) => {
      this.log.debug(`action added, name: ${action.name || '<anonymous>'}`)
    })
  }

  async renderTemplate(relativePath: string, handleInclude: boolean): Promise<string> {
    return this.templateRender.renderTemplate(this.data.workingDir, relativePath, handleInclude, this.data.customizedValues)
  }
}