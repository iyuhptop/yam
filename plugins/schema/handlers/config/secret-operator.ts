import { OperateFunction } from "@yam/types"
import { ApplicationSecret } from "../../application.schema.d"

const secretOperator: OperateFunction<ApplicationSecret> = async (plan, params, diff) => {
  if (!params.name) {
    return
  }
  // secret operator
}

export default secretOperator