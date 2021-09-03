import type { ExecuteContext, KubernetesOperator, KV, YamlTransformParam } from "@yam/types"
import axios, { AxiosRequestConfig, AxiosResponse } from "axios"
import { JSONPath } from "jsonpath-plus"
import * as lodash from 'lodash'
import KubernetesOperatorClient from "../kube/kube-client"
import { createLogger, mergeObject, normalizeJsonPath } from "../util"

/**
 * Apply stage context data and methods, used by plugins
 */
export default class YamApplyContext implements ExecuteContext {

  dryRunMode: boolean

  k8sClient: KubernetesOperator

  log = createLogger('apply')

  _ = lodash

  managedK8SResources = new Map<string, KV>();

  constructor(k8sClient: KubernetesOperatorClient, isDryRun: boolean) {
    this.dryRunMode = isDryRun
    this.k8sClient = k8sClient
  }

  public mergeToYaml(param: YamlTransformParam): void {
    if (!param.content) {
      return
    }
    if (!param.jsonPath) {
      const newContent = mergeObject(this.managedK8SResources.get(param.filename) || {}, param.content, param.arrayReplaceMode)
      this.managedK8SResources.set(param.filename, newContent as KV)
    } else {
      if (!this.managedK8SResources.has(param.filename)) {
        throw new Error(`can not use json path patching on none existing resource key: ${param.filename}`)
      }
      const jsonPath = normalizeJsonPath(param.jsonPath, false)
      const patchObj = JSONPath({
        path: jsonPath,
        json: this.managedK8SResources.get(param.filename) as KV
      })
      // object will be modified because of side-effect of _.mergeWith
      mergeObject(patchObj, param.content, param.arrayReplaceMode)
    }
    this.log.info("merged yaml content", param.filename)
  }

  public removeFromYaml(param: YamlTransformParam): void {
    const path = param.jsonPath
    if (!path) {
      this.managedK8SResources.delete(param.filename)
      this.log.warn(`removing resource by key: ${param.filename}`)
    } else {
      const jsonPath = normalizeJsonPath(path, true)
      const patchTargetObj = JSONPath({
        path: jsonPath,
        json: this.managedK8SResources.get(param.filename) as KV
      })
      if (!patchTargetObj) {
        throw new Error(`can not find patching target for resource: ${param.filename}, patch path: ${path}`)
      }
      const idx = path.lastIndexOf('.')
      const tailProp = path.substring(idx + 1)
      if (/^[\w\d-_]+$/.test(tailProp)) {
        this.log.warn(`delete '${tailProp}' from object path ${path.substring(0, idx)}.`)
        delete patchTargetObj[tailProp]
      } else {
        this.log.error(`tailing wildcard(${tailProp}) expression is not supported when deleting with json path, no effect.`)
      }
    }
    this.log.info("remove yaml content", param.filename)
  }

  public async sendRequest(option: AxiosRequestConfig): Promise<AxiosResponse> {
    if (option.method !== "GET" && this.dryRunMode) {
      this.log.info('return mocked result in dry-run mode.')
      return {
        status: 202,
        statusText: 'Dry Run Mode - Accepted',
        data: 'None GET requests will not be sent in dry-run mode',
        headers: {},
        config: option
      }
    }
    // send request by axios and record logs
    this.log.info(`start send HTTP request [${option.method}] - ${option.url}`)
    this.log.debug(`request detail`, option)
    const start = this._.now()
    const result = await axios.request(option)
    this.log.info(`finish HTTP request, status is ${result.status}, cost ${this._.now() - start}ms.`)
    this.log.debug(`response detail`, result)
    return result
  }

}