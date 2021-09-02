import type { ExecuteContext, KubernetesOperator, KV, YamlTransformParam } from "@yam/types"
import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios"
import * as lodash from 'lodash'
import KubernetesOperatorClient from "../kube/kube-client"
import { createLogger } from "../util"

/**
 * Apply stage context data and methods, used by plugins
 */
export default class YamApplyContext implements ExecuteContext {

  dryRunMode: boolean

  k8sClient: KubernetesOperator

  httpClient: AxiosInstance

  log = createLogger('apply')

  _ = lodash

  managedK8SResources = new Map<string, KV>();

  constructor(k8sClient: KubernetesOperatorClient, httpClient: AxiosInstance, isDryRun: boolean) {
    this.dryRunMode = isDryRun
    this.httpClient = httpClient
    this.k8sClient = k8sClient
  }

  mergeToYaml(param: YamlTransformParam): void {
    if (!param.content) {
      return
    }
    if (!param.jsonPath) {
      if (this.managedK8SResources.has(param.filename)) {
        this.log.warn(`json path not specified, will replace whole existing kubernetes object (${param.filename})`)
      }
      this.managedK8SResources.set(param.filename, param.content)
    } else {
      // TODO contains json path, resolve existing object
    }
    this.log.info("merged yaml content", param.filename, param.jsonPath)
  }

  removeFromYaml(param: YamlTransformParam): void {
    if (!param.jsonPath) {
      this.managedK8SResources.delete(param.filename)
    } else {
      // TODO contains json path, remove certain part
    }
    this.log.info("remove yaml content", param.filename, param.jsonPath)
  }

  async sendRequest(option: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.httpClient.request(option)
  }

}