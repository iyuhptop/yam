import { OperatorMode } from "@yam/types"

export interface KubernetesEnvironment {
  /**
   * name is unique for each kubernetes cluster, including stack name, eg: prod:us-east-1, dev:us-west-1
   */
  name: string

  /**
   * stack refer to one or N kubernetes clusters, eg. dev / qa / staging / production
   */
  stack: string

  /**
   * envTag is a shortname of the Kubernetes cluster, or just a region name, eg. us-east-1, us-west-1
   */
  envTag: string

  /**
   * kube config file path, by default is ~/.kube/config or KUBECONFIG env var
   */
  kubeConfPath: string

  /** 
   * context name in kube config file, need to be specified only if the context name is not same as 'name' field
   */
  kubeConfContextName: string
}

/**
 * Variables in YAM config file
 */
export type ContextVariables = Map<string, unknown>

/**
 * Command line parameters, the highest priority
 */
export type CmdVariables = Map<string, string>

/**
 * Plugins combined together, using DFS to apply to YAM object, implementing the whole operation workflow
 */
export interface YamPlugin {
  /**
   * Unique name of the plugin
   */
  name: string

  /**
   * Plugin version
   */
  version: string

  /**
   * Plugin download directory, by default is ~/.yam/plugins/<version>/<plugin-name>
   */
  directory: string

  /**
   * Specify which application models to apply
   */
  applyTo?: string[]

  /**
   * Isolated env vars for each plugin, avoid key leak
   */
  environmentVars: Map<string, string>

  enable: boolean

  /**
   * No need to download or change require dir for built-in core plugins 
   */
  builtIn: boolean
}

/**
 * The parameters for starting MainOperator
 */
export interface OperatorParam {

  /**
   * The app model directory, should contains app.yaml or yam.yaml
   */
  workingDir: string

  /**
   * Pure Plan Mode, just generate binary plan and persist
   */
  runMode: OperatorMode

  /**
   * If planned in advance, plan file could be specified in Apply stage
   * eg. yam apply -f release-plan-<timestamp>.bin
   */
  planFile: string

  /**
   * Control the side-effect for Apply Mode, dry-run won't write anything 
   * into Kubernetes or send any None-Get requests
   */
  dryRunMode: boolean

  clusters: KubernetesEnvironment[]

  /**
   * Command line parameters
   */
  cmdParams: CmdVariables

  /**
   * Configurations of YAM engine, by default in ~/.yam/config.yaml
   */
  engine: EngineConfig
}

export type EngineConfig = {
  serverConf: ServerConfig
  clientConf: ClientConfig
  variables: ContextVariables
  plugins: YamPlugin[]
}

/**
 * YAM engine client side configurations
 */
export type ClientConfig = {
  kubeConfig: string
  contextMapping: Map<string, string>
  telemetry: boolean
  lockType: StateLockType
  planStoreType: PlanFileStoreType
}

export type StateLockType = 'none' | 'k8s' | 'cloud'
export type PlanFileStoreType = 'local-file' | 'cloud' | 'hybrid'

/**
 * YAM.plus server configurations
 */
export type ServerConfig = {
  url: string
  appKey: string
}