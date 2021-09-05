import { K8SResourceType, KVString, OperateFunction } from "@yam/types"
import { Configuration } from "../../application.schema"

const configOperator: OperateFunction<Configuration> = async (plan, diff) => {
  for (const item of diff.currentItems) {
    if (item.from) {
      const configMapData = {} as KVString
      for (const confPath of item.from) {
        const configData = await plan.renderTemplate(confPath, false)
        // avoid mount errors while using multiple level config,
        // eg: my-conf/~{ some.param }/app.config.yaml => mount as 'app.config.yaml'
        const tailingFilePath = confPath.substring(confPath.lastIndexOf('/') + 1)
        if (confPath.indexOf('/') !== -1) {
          plan.log.info(`${confPath} will be flatted to ${tailingFilePath} because configMap doesn't support nested directories`)
        }
        configMapData[tailingFilePath] = configData
        plan.log.debug(configData, `configuration ${item.name}.${tailingFilePath} rendered`)
      }
      plan.action(async (ctx) => {
        await ctx.k8sClient.saveConfig({
          name: plan.data.currentModelFull.metadata.app + "-" + item.name,
          data: configMapData
        })
      }, `sync-configMap:${item.name}`)
    }
  }

  for (const deletedItem of diff.deletedItems) {
    plan.action(async (ctx) => {
      await ctx.k8sClient.delete({
        name: deletedItem.name,
        namespace: plan.data.currentModelFull.metadata.namespace,
        kind: K8SResourceType.ConfigMap
      })
      ctx.log.info(`configMap ${deletedItem.name} has been deleted from cluster`)
    }, `delete-configMap:${deletedItem.name}`)
  }

}

export default configOperator