import KubernetesOperatorClient from "../kube/kube-client"
import { StateLockType, OperatorParam } from "../types"
import { createLogger } from "../util"

export default class YamStateLocker {

  private operatorParam: OperatorParam
  private kubeClient: KubernetesOperatorClient
  private lockType: StateLockType

  private log = createLogger("state-locker")

  constructor(operatorParam: OperatorParam, kubeClient: KubernetesOperatorClient) {
    this.lockType = operatorParam.engine.clientConf.lockType
    this.operatorParam = operatorParam
    this.kubeClient = kubeClient
  }
  async lock(param: OperatorParam): Promise<void> {
    // TODO
    if (this.lockType === "none") {
      this.log.warn('no lock mode may cause inconsistance when operating concurrently.')
      return
    }
    this.log.info(`locking`)

    if (this.lockType === "k8s") {
      // create a temp configMap as locker
    } else if (this.lockType === "cloud") {
      // use yam.plus as distributed lock for each application/tenant 
      // (lock level could be set to tenant/team/app level on cloud, or lock when some JIRA issue not approved, to implement operation control)
    }
    this.log.info(`locked`)
  }

  async unlock(param: OperatorParam, lockObj: unknown) {
    // TODO
    this.log.info(`unlocked`)
  }

}