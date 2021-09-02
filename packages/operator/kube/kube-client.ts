import { ApiType, KubernetesObject, V1PodList } from "@kubernetes/client-node";
import {
  ApiConstructor, ConfigData, FetchLogParam, ForwardParam, ForwardResult,
  JobParam, K8SResourceMeta, KubernetesOperator, KV, KVString, WorkloadStatus
} from "@yam/types";
import { KubernetesEnvironment } from "../types";
import { createLogger } from "../util";

export default class KubernetesOperatorClient implements KubernetesOperator {

  private kubeConfig
  private log = createLogger('kubernetes')

  private constructor(kubeConfig: KubernetesEnvironment[]) {
    this.kubeConfig = kubeConfig
  }

  static async create(kubeConfig: KubernetesEnvironment[]) {
    const kClient = new KubernetesOperatorClient(kubeConfig)
    return kClient
  }

  async find(resource: K8SResourceMeta, cluster?: string): Promise<KubernetesObject[]> {
    this.log.info('[kubernetes] find resource.')
    this.kubeConfig
    return []
  }

  async apply(resource: string | KV, cluster?: string): Promise<boolean> {
    this.log.info('[kubernetes] apply resource.')
    return false
  }

  async remove(resource: K8SResourceMeta, cluster?: string): Promise<boolean> {
    this.log.info('[kubernetes] remove resource.')
    return true
  }

  async getPods(workload: K8SResourceMeta, cluster?: string): Promise<V1PodList> {
    this.log.info('[kubernetes] remove resource.')
    return new V1PodList()
  }

  async getConfig(conf: ConfigData, cluster?: string): Promise<KVString> {
    this.log.info('[kubernetes] get config.')
    return {}
  }

  async saveConfig(conf: ConfigData, cluster?: string): Promise<boolean> {
    this.log.info('[kubernetes] save config.')
    return true
  }

  async runJob(param: JobParam, cluster?: string): Promise<WorkloadStatus> {
    this.log.info('[kubernetes] run job.')
    return {} as WorkloadStatus
  }

  async checkWorkloadStatus(workload: K8SResourceMeta, cluster?: string): Promise<WorkloadStatus> {
    this.log.info('[kubernetes] check status.')
    return {} as WorkloadStatus
  }

  async portForward(param: ForwardParam, cluster?: string): Promise<ForwardResult> {
    this.log.info('[kubernetes] forward port.')
    return {} as ForwardResult
  }

  async fetchLogs(param: FetchLogParam, cluster?: string): Promise<KV> {
    this.log.info('[kubernetes] container logs.')
    return {}
  }

  /**
   * Make customize API client to implement anything that couldn't be done by other pre-defined methods.
   */
  makeApiClient<T extends ApiType>(apiClientType: ApiConstructor<T>, cluster?: string): T {
    this.log.debug('[kubernetes] make client.')
    return {} as T
  }

  /**
   * Factory method to create KubernetesResource object that kind/apiVersion/metadata are set by YAM engine
   */
  makeResource<T extends KubernetesObject>(spec: unknown): T {
    this.log.debug('[kubernetes] make resource.')
    return {} as T
  }

}