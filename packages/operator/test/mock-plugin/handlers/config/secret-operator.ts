import { OperateFunction } from "@yam/types"
import { ApplicationSecret } from "../../application.schema"

const secretOperator: OperateFunction<ApplicationSecret> = async (plan, diff) => {
  if (!diff.hasDiff) {
    return
  }
  // secret operator
}

export default secretOperator