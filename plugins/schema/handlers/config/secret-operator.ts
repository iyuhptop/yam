import { OperateFunction } from "@yam/types"
import { Configuration } from "../../application.schema.d"

const operator: OperateFunction = async (plan, params: Configuration) => {
  if (!params.from) {
    return
  }

  // append an action to save configMap
  plan.action(async (ctx) => {
    // nothing
  })
}

export default operator;

