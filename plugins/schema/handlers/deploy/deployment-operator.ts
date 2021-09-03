import { DiffResult, ExecuteContext, Operator, PlanContext } from "@yam/types"

export default class DeploymentOperator implements Operator {

  async buildDeploymentSpec(ctx: ExecuteContext) {
    ctx.log.info("run stage - deployment")
  }

  async operate(plan: PlanContext, params: unknown, diff: DiffResult[]) {
    plan.log.info("plan deployment")
    plan.action(this.buildDeploymentSpec)
  }

}