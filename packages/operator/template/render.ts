import type { IApplicationModel, KV } from "@yam/types"
import * as fs from 'fs-extra'
import * as yaml from 'js-yaml'
import * as path from 'path'
import { BUILT_IN_PARAMS, BUILT_IN_PARAM_MAP, VALUES_DIR } from "../constants"
import { KubernetesEnvironment } from "../types"
import { createLogger } from '../util'

/**
 * Match placeholder expression like ~{ param, default}
 */
const templateMatcher = /~\{\s*([\w\d.\-_]{1,80})\s*,?\s*([^}]{0,128})\s*\}/g
const exactTemplateMatcher = /^\s*~\{\s*([\w\d.\-_]{1,80})\s*,?\s*([^}]{0,128})\s*\}\s*$/

/**
 * Match include expression like include('some/file.yaml')
 */
const includeTemplateMatcher = /^\s*include\(['"]*([^'")]+\.(yml|yaml))['"]*\)\s*$/g

/**
 * TemplateRender could resolving dynamic parameters from values/ dir,
 * another functionality is using dynamic values to rendering other templates.
 */
export default class TemplateRender {

  fileContentCache = new Map<string, string>()
  includeCache = new Set<string>()

  private log = createLogger('template')

  public async readCustomizedValues(workingDir: string, cmdParams: Map<string, string>, clusters: KubernetesEnvironment[], model: IApplicationModel): Promise<Map<string, KV>> {
    const valuesDir = path.join(workingDir, VALUES_DIR)

    // final result after transform, like { "someEnv": { "someParam" : "someValue" } }
    const result = new Map<string, KV>()
    const stacks = new Map<string, string[]>()
    clusters.forEach(env => {
      // stack level map acts as default/fallback value, if parameter value not found with key 'env.name'
      result.set(env.stack, {})
      result.set(env.name, {})
      if (!stacks.has(env.stack)) {
        stacks.set(env.stack, [])
      }
      stacks.get(env.stack)?.push(env.name)
    })

    // raw result read from values yaml, like { "someParam": { "someEnv": "someValue" } }
    let rawParameters = new Map<string, KV>()

    if (fs.pathExistsSync(valuesDir)) {
      rawParameters = await this.readCustomizedValuesRecursive(workingDir, VALUES_DIR, 0)
      this.log.info("resolved values directory")
    } else {
      this.log.debug('no values directory found. skip parameters reading')
    }

    // transform to cluster first map
    rawParameters.forEach((envKV, param) => {
      Object.keys(envKV).forEach(env => {
        const value = envKV[env]
        if (!result.has(env)) {
          this.log.warn(`not recognized environment name: ${env}, skipped.`)
          return
        }
        const tmp = result.get(env) as KV
        tmp[param] = value
      })
    })

    // append built-in parameter values
    clusters.forEach(cluster => {
      const paramKV = result.get(cluster.name)
      if (paramKV) {
        // need to be synced
        paramKV[BUILT_IN_PARAM_MAP.APPLICATION] = model.metadata.app
        paramKV[BUILT_IN_PARAM_MAP.NAMESPACE] = model.metadata.namespace
        paramKV[BUILT_IN_PARAM_MAP.STACK] = cluster.stack
        paramKV[BUILT_IN_PARAM_MAP.ENV_TAG] = cluster.envTag
      }
    })

    // append cmdParams into each cluster values map (including built-in params)
    result.forEach((paramKV) => cmdParams.forEach((v, k) => {
      // output info & warnings if the parameter is overridden by command line, except --version
      if (paramKV[k] !== undefined && k !== "version") {
        if (BUILT_IN_PARAMS.indexOf(k) !== -1) {
          this.log.warn(`built-in parameter ${k} will be overridden. built-in params (${BUILT_IN_PARAMS.join(',')}) are not allowed to be overridden.`)
        } else {
          this.log.info(`parameter ${k} will be overridden by command line arg value: ${v}`)
        }
      }
      paramKV[k] = v
    }))

    // copy stack level parameters to env level
    stacks.forEach((envs, stackName) => {
      const stackDefaultVal = result.get(stackName) as KV
      if (Object.keys(stackDefaultVal).length > 0) {
        envs.forEach(env => {
          const envSpecificVal = result.get(env) as KV
          for (const paramName in stackDefaultVal) {
            // set default value for each env
            envSpecificVal[paramName] = stackDefaultVal[paramName]
          }
        })
      }
    })
    return result
  }

  public async renderTemplate(workDir: string, relativePath: string, handleInclude: boolean, customizedValues: KV): Promise<string> {
    this.log.info('read template file', relativePath)
    const isYaml = relativePath.endsWith('.yml') || relativePath.endsWith('.yaml')
    let str = await this.checkAndReadFile(workDir, relativePath)

    // handle include('relative/path/to/file.yaml')
    if (isYaml && handleInclude) {
      // if the template string has include expression, recursively resolve it, eg: include("path/to/another/file.yaml")
      const obj = yaml.load(str)
      await this.resolveIncludeExpression(workDir, obj)
      str = yaml.dump(obj)
    }

    // resolve placeholder like '~{ some.param, default-value }', with real value of current stack-env
    return this.resolvePlaceHolders(str, isYaml, customizedValues)
  }

  public async loadYaml(workDir: string, filepath: string): Promise<unknown> {
    const str = await this.checkAndReadFile(workDir, filepath)
    return yaml.load(str)
  }

  private async readCustomizedValuesRecursive(workingDir: string, valuesDir: string, depth: number): Promise<Map<string, KV>> {
    const rawParameters = new Map<string, KV>()
    if (depth >= 5) {
      return rawParameters
    }
    const valueFiles = await fs.readdir(valuesDir)
    for (const file of valueFiles) {
      const tmp = path.join(valuesDir, file)
      // recursively scan values/ directory and sub directories
      if (fs.statSync(tmp).isDirectory()) {
        const tmpMap = await this.readCustomizedValuesRecursive(workingDir, tmp, depth + 1)
        tmpMap.forEach((v, k) => !rawParameters.has(k) && rawParameters.set(k, v))
      }
      if (!this.isYaml(file)) {
        continue
      }
      // read yam data 
      const obj = await this.loadYaml(workingDir, path.join(VALUES_DIR, file)) as KV
      Object.keys(obj).forEach(k => rawParameters.set(k, obj[k] as KV))
    }
    return rawParameters
  }

  private async checkAndReadFile(workDir: string, relativePath: string): Promise<string> {
    if (this.fileContentCache.has(relativePath)) {
      return this.fileContentCache.get(relativePath) as string
    }
    const fPath = path.join(workDir, relativePath)
    if (!fs.existsSync(fPath)) {
      throw new Error(`file: ${fPath} not exists`)
    }
    const buffer = await fs.readFile(fPath)
    this.fileContentCache.set(relativePath, buffer.toString())
    return this.fileContentCache.get(relativePath) as string
  }

  private resolvePlaceHolders(tpl: string, isYaml: boolean, customizedValues: KV): string {
    if (!isYaml) {
      return this.renderVariableStr(tpl, customizedValues)
    }
    const obj = yaml.load(tpl)
    this.walkObject(obj as KV, customizedValues)
    return yaml.dump(obj)
  }

  private walkObject(obj: KV | Array<unknown>, params: KV) {
    if (obj instanceof Array) {
      for (const item of obj) {
        this.walkObject(item as KV, params)
      }
      return
    }
    if (typeof obj === "object") {
      for (const prop in obj) {
        const value = obj[prop]
        // check and replace property values of the object
        if (typeof value === "string") {
          const { exactlyMatch, match } = this.containsPlaceHolder(value)
          if (match) {
            this.renderObjectProperty(obj, prop, false, exactlyMatch, params)
          }
        } else if (typeof value === "object") {
          this.walkObject(value as KV, params)
        }

        // finish values check, now check property name itself
        const { exactlyMatch, match } = this.containsPlaceHolder(prop)
        if (match) {
          this.renderObjectProperty(obj, prop, true, exactlyMatch, params)
        }
      }
    }
  }

  private async resolveIncludeExpression(workingDir: string, obj: unknown) {
    if (obj instanceof Array) {
      for (const index in obj) {
        const entry = obj[index]
        if (typeof entry === "string" && includeTemplateMatcher.test(entry)) {
          obj[index] = await this.checkAndLoadIncludedFile(workingDir, entry)
        } else if (typeof entry === "object") {
          await this.resolveIncludeExpression(workingDir, entry)
        }
      }
    }
    for (const key in obj as KV) {
      const value = (obj as KV)[key]
      if (typeof value === "string" && includeTemplateMatcher.test(value)) {
        (obj as KV)[key] = await this.checkAndLoadIncludedFile(workingDir, value)
      } else if (typeof value === "object") {
        this.resolveIncludeExpression(workingDir, value)
      }
    }
  }

  private isYaml(file: string) {
    return file.endsWith('.yaml') || file.endsWith('.yml')
  }

  private containsPlaceHolder(str: string): { match: boolean, exactlyMatch: boolean } {
    const matches = exactTemplateMatcher.test(str)
    if (matches) {
      return { match: true, exactlyMatch: true }
    } else {
      return { match: templateMatcher.test(str), exactlyMatch: false }
    }
  }

  private async checkAndLoadIncludedFile(workingDir: string, expr: string) {
    const path = (includeTemplateMatcher.exec(expr) as RegExpExecArray)[1]
    if (this.includeCache.has(path)) {
      this.log.error(`${expr} could not be applied because ${path} has been included by other file`)
      throw new Error(`can not include ${path} again`)
    }
    const result = await this.loadYaml(workingDir, path)
    this.includeCache.add(path)
    return result
  }

  /**
   * If the template file is Yaml/Yml format, switch to render object mode, rather than simple placeholder replacing mode
   * eg. 
   * my-config:
   *   ~{prop}: dummy-~{value}
   *   dummy: ~{ not.string.a.whole.yaml.object }
   * ===>
   * my-config:
   *   propVal: dummy-val
   *   dummy:
   *     k: v
   */
  private renderObjectProperty(obj: unknown, propName: string, isProp: boolean, exactMatchProp: boolean, values: KV) {
    const objKV = (obj as KV)
    if (isProp) {
      const value = objKV[propName]
      const newPropName = this.renderVariableStr(propName, values)
      objKV[newPropName] = value
      delete objKV[propName]
    } else {
      if (exactMatchProp) {
        const matchResult = exactTemplateMatcher.exec(objKV[propName] as string)
        if (matchResult == null) {
          return
        }
        const defaultVal = matchResult.length === 3 ? matchResult[2] : undefined
        const replacedVal = values[matchResult[1]] || defaultVal
        if (replacedVal === undefined) {
          this.log.warn(`value of parameter ${propName} is not specified, attribute will be removed`)
        }
        objKV[propName] = replacedVal
      } else {
        objKV[propName] = this.renderVariableStr(objKV[propName] as string, values)
      }
    }
  }

  /**
   * replace ~{ param, default_val } placeholder into real value, depends on values/ parameters
   */
  private renderVariableStr(str: string, values: KV): string {
    let matchResult
    let idx = 0
    let finalStr = ''
    while ((matchResult = templateMatcher.exec(str)) != null) {
      const defaultVal = matchResult.length === 3 ? matchResult[2] : ''
      finalStr += str.substring(idx, matchResult.index) + (values[matchResult[1]] as string || defaultVal).toString()
      idx += matchResult[0].length
    }
    finalStr += str.substring(idx)
    return finalStr
  }
}