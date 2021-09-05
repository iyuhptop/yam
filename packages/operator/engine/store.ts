import { PlanContext } from "@yam/types"
import KubernetesOperatorClient from "../kube/kube-client"
import { OperatorParam, PlanFileStoreType } from "../types"
import { createLogger } from "../util"

export default class YamStateStore {

  private storeType: PlanFileStoreType
  private operatorParam: OperatorParam
  private kubeClient: KubernetesOperatorClient

  private log = createLogger("state-store")

  constructor(operatorParam: OperatorParam, kubeClient: KubernetesOperatorClient) {
    this.storeType = operatorParam.engine.clientConf.planStoreType
    this.operatorParam = operatorParam
    this.kubeClient = kubeClient
  }

  async persistPlan(planContext: PlanContext): Promise<void> {
    if (this.operatorParam.runMode !== "plan-only") {
      this.log.info(`run in ${this.operatorParam.runMode} mode, skip persisting plan-file.`)
      return
    }

    // TODO create tmp directory and persist current models, settings, then zip it
    this.log.info(`start persisting YAM plan file.`)

    if (this.storeType === "local-file" || this.storeType === "hybrid") {
      // TODO
    } else if (this.storeType === "cloud") {
      // TODO encrypt and send to https://yam.plus
    }

    this.log.info(`YAM plan file stored somewhere`)
  }

  async storeResult(): Promise<void> {
    if (this.operatorParam.runMode === "plan-only") {
      return
    }
    this.log.info(`storing operation results.`)

    // store configMap 

    // TODO in cloud mode, each plan/apply has unique id, result could send to cloud with that id, for cloud dashboards
    this.log.info(`operation results persisted.`)
  }

}