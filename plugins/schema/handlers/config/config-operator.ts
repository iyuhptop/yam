import { KVString, PlanContext } from "@yam/types"
import { Configuration } from "../../application.schema.d"

export default async (plan: PlanContext, params: Configuration) => {
  if (!params.from) {
    return
  }

  // render the application config with parameter values
  const configMapData = {} as KVString
  for (const confPath of params.from) {
    const configData = await plan.renderTemplate(confPath, false)
    configMapData[confPath] = configData
    plan.log.debug(configData, "configuration rendered")
  }

  // no configMap data found
  if (Object.keys(configMapData).length === 0) {
    return
  }

  // append an action to save configMap
  plan.action(async (ctx) => {
    await ctx.k8sClient.saveConfig({
      name: plan.data.currentModelFull.metadata.app + "-" + params.name,
      data: configMapData
    })
  })
}
