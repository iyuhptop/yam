import { PlanContext } from "@yam/types"
import { OperatorParam, PlanFileStoreType } from "../types"
import { createLogger } from "../util"

export default class YamStateStore {

  private storeType: PlanFileStoreType
  private operatorParam: OperatorParam
  private log = createLogger("state-store")

  constructor(operatorParam: OperatorParam) {
    this.storeType = this.operatorParam.engine.clientConf.planStoreType
    this.operatorParam = operatorParam
  }

  async persistPlan(planContext: PlanContext): Promise<void> {
    if (this.operatorParam.runMode !== "plan-only") {
      this.log.info(`run in ${this.operatorParam.runMode} mode, skip persisting plan-file.`)
      return
    }

    // TODO create tmp directory and persist current models, settings, variables, then zip it

    if (this.storeType === "local-file" || this.storeType === "hybrid") {
      // TODO
    } else if (this.storeType === "cloud") {
      // TODO encrypt and send to https://yam.plus
    }
  }

  async storeResult(): Promise<void> {
    if (this.operatorParam.runMode === "plan-only") {
      return
    }

    // TODO in cloud mode, each plan/apply has unique id, result could send to cloud with that id, for cloud dashboards
  }

}