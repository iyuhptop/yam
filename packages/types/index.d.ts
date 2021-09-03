import type { ApiType, CoreV1Event, KubernetesObject, V1ContainerStatus, V1JobSpec, V1PodList } from "@kubernetes/client-node"
import type { AxiosRequestConfig, AxiosResponse } from "axios"
import type { LoDashStatic } from 'lodash'
import type { Logger } from "pino"

export type KV = {
  [key: string]: unknown
}

export type KVString = {
  [key: string]: string
}

export interface SchemaHandler {
  name: string,
  schema: unknown,
  handlers: KV
}

export enum WorkloadType {
  Deployment,
  StatefulSet,
  DaemonSet,

  Job,
  CronJob
}

/**
 * The diff result between previous YAM and current YAM.
 * "path" is the object/array json path, when previous/current is null,
 * it indicates it was new created or deleted.
 */
export type DiffResult = {
  jsonPath: string
  previous: unknown | null
  current: unknown | null
}

/**
 * PlanContext will be provided in Plan stage, generate plan file and 
 * dry run the YAM files, prompt is also allowed in this stage.
 */
export interface PlanContext {
  data: PlanContextData

  log: Logger

  _: LoDashStatic

  /**
   * append actions to be executed in Apply stage.
   */
  action: (...actions: Action[]) => void

  /**
   * prompt user to input customized variables in Plan stage,
   * while running in Apply stage, it will use default value or planned value.
   */
  prompt: <T> (variableName: string, text: string, defaultVal: T) => Promise<T>

  /**
   * read files of YAM directory relative path, handle yaml includes and replace placeholders with values
   */
  renderTemplate: (relativePath: string, handleInclude: boolean) => Promise<string>
}

/**
 * A container for preserve Plan stage inputs and outputs
 */
export type PlanContextData = {
  actions: Action[]

  customizedValues: KV

  currentModelFull: IApplicationModel
  previousModelFull: IApplicationModel

  variables: Map<string, unknown>

  workingDir: string
  stackName: string
  environmentName: string

  runMode: OperatorMode
}

export type OperatorMode = 'plan-only' | 'apply-only' | 'plan-apply'

/**
 * In execute stage, all available actions are defined in ExecuteContext,
 * 
 */
export interface ExecuteContext {

  /**
   * In dry-run mode, no side effect, each plugin should implement dry-run mode
   * Side effect actions like fetchLogs / sendRequest / runJob will return with mocked result.
   */
  dryRunMode: boolean


  /**
   * KubernetesObject manipulation, core features of YAM.
   */
  mergeToYaml: (param: YamlTransformParam) => void
  removeFromYaml: (param: YamlTransformParam) => void

  /**
   * API call using Axios, for integrating will other systems.
   */
  sendRequest: (option: AxiosRequestConfig) => Promise<AxiosResponse>

  /**
   * K8S Client, contains a set of pre-defined operations.
   */
  k8sClient: KubernetesOperator

  /**
   * Managed resources are KubernetesObject that will be applied to Cluster one by one.
   */
  managedK8SResources: Map<string, KV>

  log: Logger

  _: LoDashStatic
}

declare type ApiConstructor<T extends ApiType> = new (server: string) => T;

export interface KubernetesOperator {
  find: (resource: K8SResourceMeta, cluster?: string) => Promise<KubernetesObject[]>
  apply: (resource: string | KV, cluster?: string) => Promise<boolean>
  remove: (resource: K8SResourceMeta, cluster?: string) => Promise<boolean>

  getPods: (workload: K8SResourceMeta, cluster?: string) => Promise<V1PodList>
  getConfig: (conf: ConfigData, cluster?: string) => Promise<KVString>
  saveConfig: (conf: ConfigData, cluster?: string) => Promise<boolean>

  runJob: (param: JobParam, cluster?: string) => Promise<WorkloadStatus>
  checkWorkloadStatus: (workload: K8SResourceMeta, cluster?: string) => Promise<WorkloadStatus>
  portForward: (param: ForwardParam, cluster?: string) => Promise<ForwardResult>
  fetchLogs: (param: FetchLogParam, cluster?: string) => Promise<KV>

  /**
   * Make customize API client to implement anything that couldn't be done by other pre-defined methods.
   */
  makeApiClient: <T extends ApiType> (apiClientType: ApiConstructor<T>, cluster?: string) => T

  /**
   * Factory method to create KubernetesResource object that kind/apiVersion/metadata are set by YAM engine
   */
  makeResource: <T extends KubernetesObject>  (spec: unknown) => T
}

export type YamlTransformParam = {
  filename: string

  /**
   * JSON path to apply the change, eg. a.b.c[2].d
   */
  jsonPath?: string

  content?: KV

  /**
   * By default, when merging arrays, will use Append mode, rather than replace whole array,
   * this is different from JSON Merge Patch (https://datatracker.ietf.org/doc/html/rfc7386).
   * 
   * If arrayReplaceMode set to true, will use JSON Merge Patch mode, replace the array.
   */
  arrayReplaceMode?: boolean
}

export type K8SResourceMeta = {
  name: string
  namespace: string
  kind: string | WorkloadType
  apiVersion?: string
}

export type ConfigData = {
  name: string
  data?: KVString
  namespace?: string
  secret?: boolean
}

export type JobParam = {
  name: string
  namespace?: string
  job: V1JobSpec
  deleteOnComplete: boolean
}

export type ForwardParam = {
  app: string
  namespace: string
  targetPort: number
  containerPort?: number

  checkHealth: boolean
  checkPeriodSeconds?: number
  maxCheckTimes?: number
}

export type ForwardResult = {
  targetPod: string
  stop: () => Promise<void>
}

export type FetchLogParam = {
  pod: string
  limit: number
  namespace?: string
  tail?: boolean
  since?: string
  containers?: string[]
}

export type WorkloadStatus = {
  ready: boolean
  done: boolean
  currentPodNum: number
  examplePodStatus: V1ContainerStatus
  events: CoreV1Event[]
}

/**
 * An action is a specific operation generated in plan stage
 */
export type Action = (ctx: ExecuteContext) => Promise<void>

/**
 * OperateFunction and Operator is a common interface for implementing YAM handlers.
 */
export type OperateFunction = (plan: PlanContext, params: unknown, diff: DiffResult) => Promise<void>

export interface Operator {
  operate: OperateFunction
}

export interface IMetadata {
  /**
   * Your Application Name
   */
  app: string;
  /**
   * Your Team / Namespace
   */
  namespace: string;
  /**
   * The owner of this application
   */
  owner?: string;
  /**
   * The code repo of this application
   */
  repo?: string;
  /**
   * The brief description of your application
   */
  description?: string;
  [k: string]: unknown;
}

export interface IApplicationModel {
  /**
   * The unique schema name of application model
   */
  schema: string;
  metadata: IMetadata
  prepare?: unknown
  /**
   * Describe configurations and secrets of your application
   */
  config?: unknown
  deploy?: unknown
  access?: unknown
  [k: string]: unknown;
}


