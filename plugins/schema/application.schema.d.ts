/* tslint:disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export type RedisType = "redis" | "redis-cluster";
/**
 * Prepare infrastructure dependencies of your application
 */
export type Prerequisites = (PrerequisiteRedis | PrerequisiteMongo)[];
export type ApplicationWorkloadType = "deployment" | "statefulset" | "daemonset";
/**
 * Volume Type
 */
export type ExtraVolumeMountType = "hostPath" | "emptyDir" | "storage";
export type AuthenticationMethod = "jwt" | "basic";

/**
 * Yet Another Application Model
 */
export interface ApplicationModel {
  /**
   * The unique schema name of application model
   */
  schema: string;
  metadata: Metadata;
  prepare?: Prerequisites;
  /**
   * Describe configurations and secrets of your application
   */
  config?: (Configuration | ApplicationSecret)[];
  deploy?: Deployment;
  access?: AccessConfig;
  [k: string]: unknown;
}
/**
 * The metadata of this application
 */
export interface Metadata {
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
/**
 * Describe prerequisites and dependencies
 */
export interface PrerequisiteRedis {
  type: RedisType;
  name: string;
  [k: string]: unknown;
}
/**
 * Describe prerequisites and dependencies
 */
export interface PrerequisiteMongo {
  /**
   * Dependency type
   */
  type: "mongo";
  name: string;
  [k: string]: unknown;
}
/**
 * Configuration
 */
export interface Configuration {
  type: "configMap";
  name: string;
  asEnv?: boolean;
  /**
   * Describe where the config map being mounted to
   */
  mount?: string;
  /**
   * Describe the configuration source, the relative file paths in application model directory
   */
  from?: string[];
  /**
   * The target container of this configuration
   */
  container?: string;
  [k: string]: unknown;
}
export interface ApplicationSecret {
  type: "secret";
  name: string;
  asEnv?: boolean;
  /**
   * Describe where the config map being mounted to
   */
  mount?: string;
  kms?: {
    provider?: "aws" | "vault";
    iamRole?: string;
    [k: string]: unknown;
  };
  /**
   * Describe the secret source, the relative file paths in application model directory
   */
  keys?: {
    name: string;
    generateRandom?: {
      length: number;
      format?: "numeric" | "alphabet" | "alphabetNumeric" | "hex" | "ascii";
      [k: string]: unknown;
    };
    description?: string;
    [k: string]: unknown;
  }[];
  /**
   * The target container of this secret
   */
  container?: string;
  [k: string]: unknown;
}
/**
 * Application deployment metadata
 */
export interface Deployment {
  type: ApplicationWorkloadType;
  /**
   * Image repo for your application
   */
  imageRepo: string;
  /**
   * Image tag as deploy version
   */
  version?: string;
  /**
   * Designate ImagePullSecret
   */
  imagePullSecret?: string;
  /**
   * The commands to start the application
   */
  commands?: unknown[];
  port?: string | number;
  /**
   * The number of Pod replications
   */
  replica?: number;
  /**
   * Describe the computing resource of each application instance
   */
  resource?: {
    /**
     * CPU cores
     */
    cpu: {
      requests?: string | number;
      limits?: string | number;
      [k: string]: unknown;
    };
    /**
     * Memory size
     */
    memory: {
      requests?: string | number;
      limits?: string | number;
      [k: string]: unknown;
    };
    /**
     * GPU resources
     */
    gpu: {
      requests?: string | number;
      limits?: string | number;
      [k: string]: unknown;
    };
    [k: string]: unknown;
  };
  healthCheck?: ApplicationHealthCheck;
  /**
   * Choose where the Pod being scheduled
   */
  nodeSelector?: string;
  /**
   * Environment variables
   */
  env?: EnvironmentVariable[];
  /**
   * When canary mode turned on, new version will be deployed independently, and at most 2 versions kept
   */
  canaryMode?: boolean;
  lifecycleHook?: PodLifecycleHook;
  /**
   * The Sidecar container for the application
   */
  sidecars?: SidecarContainer[];
  gracefulPeriod?: string;
  /**
   * Extra volume mounts
   */
  mounts?: ExtraVolumeMount[];
  cronJobs?: {
    name: string;
    /**
     * Cron expression
     */
    cron: string;
    image: string;
    commands?: string[];
    [k: string]: unknown;
  }[];
  /**
   * Grant permissions to call Kubernetes API server
   */
  permissions?: KubernetesPermissionRequest[];
  /**
   * By default, force scattering Pods to different Nodes when replica > 1
   */
  forceScatterPods?: boolean;
  /**
   * Add extra native orchestration files to apply
   */
  extraFiles?: string[];
  /**
   * Raw definitions of the  container
   */
  extraPatches?: {
    jsonPath?: string;
    patchMode?: "merge" | "replace" | "append";
    rawYaml?: {
      [k: string]: unknown;
    };
    [k: string]: unknown;
  }[];
  [k: string]: unknown;
}
/**
 * Define health check of your application
 */
export interface ApplicationHealthCheck {
  /**
   * Enable health check or not
   */
  enable?: boolean;
  /**
   * The health check url
   */
  url: string;
  /**
   * Health check Port, the same as main container port if not set
   */
  port?: number;
  /**
   * Health check interval
   */
  interval?: string;
  livenessCheckDelay?: string;
  /**
   * Define actions when health check fails
   */
  onFailure?: {
    /**
     * The threshold of failure times
     */
    times: number;
    action: "restart" | "preventTraffic";
    [k: string]: unknown;
  }[];
  [k: string]: unknown;
}
/**
 * Environment variable
 */
export interface EnvironmentVariable {
  /**
   * Variable name
   */
  name: string;
  /**
   * Variable value
   */
  value?: string;
  /**
   * Designate which container to mount this environment variable
   */
  container?: string;
  /**
   * Value from field reference
   */
  valueFrom?: {
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
/**
 * Define The hooks when Pod lifecycle events triggered
 */
export interface PodLifecycleHook {
  /**
   * The extra script to run after started
   */
  afterStart?: string[];
  /**
   * The extra script to run before terminating
   */
  beforeTerminate?: string[];
  [k: string]: unknown;
}
/**
 * Sidecar containers run in same Pod as the application
 */
export interface SidecarContainer {
  /**
   * Container Name
   */
  name: string;
  /**
   * Is init container or not
   */
  initContainer: boolean;
  image?: string;
  commands?: string[];
  healthCheck?: ApplicationHealthCheck;
  /**
   * Raw definitions of the sidecar container
   */
  rawYaml?: {
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
/**
 * Extra volume mount
 */
export interface ExtraVolumeMount {
  type: ExtraVolumeMountType;
  /**
   * Volume Mount Name
   */
  name: string;
  from?:
    | string
    | {
        [k: string]: unknown;
      };
  /**
   * The path to be mounted on container
   */
  path: string;
  /**
   * The size of the volume, only for 'storage' type
   */
  size?: string;
  /**
   * Specify the storage provisioner, only for 'storage' type
   */
  storageClass?: string;
  /**
   * Designate which container to be mounted
   */
  container?: string;
  [k: string]: unknown;
}
/**
 * The permission to call Kubernetes API server
 */
export interface KubernetesPermissionRequest {
  /**
   * Resource Group
   */
  group?: string;
  /**
   * Resources
   */
  resources: string;
  /**
   * Verbs, besides Kubernetes native verbs, YAM provide alias: read, all
   */
  verbs: string;
  /**
   * Binding with ClusterRole or Namespaced Role
   */
  clusterLevel?: boolean;
  [k: string]: unknown;
}
export interface AccessConfig {
  /**
   * The ingress and routing configurations.
   */
  route?: ApplicationIngressRoute[];
  auth?: ApplicationAuthentication[];
  [k: string]: unknown;
}
/**
 * The ingress and routing configuration.
 */
export interface ApplicationIngressRoute {
  type: "https" | "http" | "tcp" | "udp";
  /**
   * Hostname or domain name of the ingress
   */
  host?: string;
  /**
   * The TLS certificate secret name for ingress TLS-offloading
   */
  cert?: string;
  /**
   * container / service port
   */
  port: number;
  /**
   * Ingress class name
   */
  ingressClass?: string;
  /**
   * while load balancer mode is turned on, no ingress will be created, LoadBalancer type Kubernetes Service will be created.
   */
  useLoadBalancer?: {
    loadBalancerAnnotations?: {
      [k: string]: unknown;
    };
    cidrAlowList?: string[];
    [k: string]: unknown;
  };
  /**
   * Host port mode is highly NOT recommended.
   */
  useHostPort?: {
    from?: number;
    to?: number;
    [k: string]: unknown;
  };
  /**
   * Node port mode is highly NOT recommended.
   */
  useNodePort?: {
    from?: number;
    to?: number;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
/**
 * Describe the authentication methods for your application.
 */
export interface ApplicationAuthentication {
  type: AuthenticationMethod;
  issuer?: string;
  audience?: string;
  [k: string]: unknown;
}
