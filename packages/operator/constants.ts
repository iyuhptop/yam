/**
 * YAM engine will detect these files in working directory.
 */
export const APP_MODEL_FILES = ['app.yaml', 'app.yml', 'yam.yaml', 'yam.yml']

/**
 * YAM engine will detect values/ directory to fetch env related dynamic parameters recursively in working directory
 */
 export const VALUES_DIR = "values"

/**
 * Built-int default YAM schema name. 'schema: application/1.x'
 */
export const SCHEMA_NAME = 'application'

/**
 * YAM engine will backup the application model declaration to ConfigMap,
 * for implementing Previous-Current Diff and Canary release rotation.
 */
export const YAM_PREFIX = 'yam-'

/**
 * Built-in parameters could be directly referenced by placeholder, eg: ~{ version } or ~{ engTag }
 */
export const BUILT_IN_PARAM_MAP = {
  VERSION: "version",
  NAMESPACE: "namespace",
  APPLICATION: "app",
  STACK: "stack",
  ENV_TAG: "envTag",
}
export const BUILT_IN_PARAMS = Object.values(BUILT_IN_PARAM_MAP)