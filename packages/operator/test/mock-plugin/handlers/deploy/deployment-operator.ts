import { DiffResult, ExecuteContext, Operator, PlanContext } from "@yam/types"
import { Deployment } from "../../application.schema"

export default class DeploymentOperator implements Operator<Deployment> {

  async operate(plan: PlanContext, diff: DiffResult<Deployment>): Promise<void> {
    if (!diff.hasDiff) {
      plan.log.info(`no changes found for deployment, skip deploying on ${plan.data.envTagName}`)
      return
    }

    plan.log.info("plan deployment")
    plan.action(this.buildDeploymentSpec)
  }

  async buildDeploymentSpec(ctx: ExecuteContext): Promise<void> {
    ctx.log.info("apply deployment to kubernetes")
    return
  }

}