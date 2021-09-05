import { IApplicationModel, OperateFunction, Operator, PlanContext, PluginDefinition } from '@yam/types'
import * as _ from 'lodash'
import type { YamPlugin } from '../types'
import { createLogger } from '../util'

/**
 * YamPluginComposer handles plugin modules, it will:
 * a. analyze plugin JSON Schema, merge into one schema
 * b. analyze JSON path handler functions definied in each plugin
 */
export default class YamPluginComposer {

  private log = createLogger('plugin-handler')

  /**
   * Schema builder will import plugin codes, retrieve JSON Schema and Handler Functions,
   * Inside a plugin, each JSON Schema defines subset of final YAM schema,
   * while each JSON-Path matcher and OperateFunction of the plugin handler define operation logic.
   * 
   * An example plugin should provide default exported object like following:
   * ```js
   * {
   *   "name": "example-plugin",
   *   "schema": {
   *     "$schema": "http://json-schema.org/draft-07/schema",
   *     "type": "object"
   *     "properties": {}
   *   },
   *   "handlers": {
   *      "access.route": 
   *      "config[?(@.type=='configMap')]": async (plan, param, diff) => {}
   *   }
   * }
   * ```
   * NOTE: YAM engine will add "$." prefix if it's not defined in Matcher JSON Path Expression
   * 
   * @see https://json-schema.org/specification.html
   * @see https://tools.ietf.org/id/draft-goessner-dispatch-jsonpath-00.html
   */
  async compose(plugins: YamPlugin[], workingDir: string, currentYam: IApplicationModel): Promise<SchemaHandlerFunc> {
    let mergedJsonSchema = {}
    const mergedHandlers: MergedHandler[] = []

    for (const plugin of plugins) {
      if (!plugin.enable) {
        continue
      }

      const schemaName = currentYam.schema.split('/')[0].trim()
      if (plugin.applyTo?.indexOf(schemaName) === -1) {
        continue
      } else {
        this.log.info(`loading plugin: ${plugin.name}:${plugin.version}`)
      }

      // import plugin as commonjs module dynamically
      let requiredPlugin
      try {
        // dynamic import plugin codes in plugin directory
        if (!plugin.directory) {
          throw new Error(`plugin directory not provided for ${plugin.name}`)
        }
        !plugin.builtIn && module.paths.unshift(plugin.directory)
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        requiredPlugin = require(plugin.name)
      } catch (err) {
        this.log.error(err)
        throw new Error(`import plugin ${plugin.name}:${plugin.version} in dir ${plugin.directory} failed`)
      } finally {
        !plugin.builtIn && module.paths.shift()
      }
      const pluginModule = requiredPlugin.default as PluginDefinition

      // schema is the json schema for validating currentYam object, merge all plugins schema
      mergedJsonSchema = this.mergeJsonSchema(pluginModule.schema, mergedJsonSchema)

      // merge all plugins handlers, build handler array
      this.mergeHandlers(pluginModule, mergedHandlers, plugin)
    }
    this.sortHandlers(mergedHandlers)
    this.log.info(`plugins and schema loaded, composed ${mergedHandlers.length} operation handlers.`)
    return { jsonSchema: mergedJsonSchema, handlers: mergedHandlers }
  }

  /**
   * sort handlers by it's matcher expression, to make it run in correct order
   */
  private sortHandlers(mergedHandlers: MergedHandler[]) {
    // order of workflow stages
    const order = {
      metadata: 1e1,
      prepare: 1e2,
      config: 1e3,
      deploy: 1e4,
      access: 1e5,
      observe: 1e6,
      scale: 1e7,
    } as { [key: string]: number }
    const getFirstPropOrder = (str: string): number => {
      if (str.startsWith("$.")) {
        str = str.substring(2)
      }
      str = str.substring(0, str.indexOf("."))
      return order[str] || Number.MAX_SAFE_INTEGER
    }
    mergedHandlers.sort((h1, h2) => {
      const m1 = getFirstPropOrder(h1.matcher)
      const m2 = getFirstPropOrder(h2.matcher)
      if (m1 == m2) {
        // run in same stage, compare matcher expression length, the shortest one run at first
        return h1.matcher.length - h2.matcher.length
      } else {
        return m1 - m2
      }
    })
  }


  /**
   * resolve json schema, merge into one final schema
   */
  private mergeJsonSchema(sourceSchema: unknown, mergedSchema: unknown) {
    return _.mergeWith({}, sourceSchema, mergedSchema, (mergedValue, newValue, key) => {
      if (_.isNil(mergedValue)) {
        return
      }
      if (key === 'required') {
        return _.uniq(mergedValue.concat(newValue))
      }
      if (_.isPlainObject(mergedValue)) {
        if (!_.isPlainObject(newValue)) {
          throw new Error(`Failed to merge schemas because "${key}" has different values.`)
        }
        return
      }
      return
    })
  }

  /**
   * resolve operator functions of certain plugin
   */
  private mergeHandlers(pluginModule: PluginDefinition, mergedHandlers: MergedHandler[], plugin: YamPlugin): void {
    const handlers = pluginModule.handlers
    const name = pluginModule.name
    if (name !== plugin.name) {
      throw new Error(`invalid plugin, plugin ${plugin.name}'s module name ${name} mis-match`)
    }

    for (const jsonPathMatcher in handlers) {
      let handlerFunc = handlers[jsonPathMatcher]
      if (handlerFunc instanceof Function) {
        // use Class style operator declaration
        if (handlerFunc.prototype && handlerFunc.prototype.operate) {
          this.log.debug(`find operator class of ${name}: ${handlerFunc.name}`)
          handlerFunc = this.wrapClassStyleOperator(handlerFunc as ObjectConstructor)
        } else {
          // arrow function style operator
          this.log.debug(`find operator function of ${name}: ${handlerFunc.name}()`)
        }

        // isolate running environment vars to avoid key disclosure, and log exceptions if fails
        const wrappedFunc = this.wrapEnvProvider(plugin, handlerFunc, jsonPathMatcher)

        // merge the function and plugin schema into mergedHandlers
        const res = mergedHandlers.find((h) => { h.matcher === jsonPathMatcher })
        const finalHandler = { pluginName: name, func: wrappedFunc }
        if (res) {
          res.handlers.push(finalHandler)
        } else {
          mergedHandlers.push({ matcher: jsonPathMatcher, handlers: [finalHandler] })
        }
      } else {
        this.log.warn(`wrong handler definition for schema path ${jsonPathMatcher} of plugin ${name}`)
      }
    }
  }

  /**
   * Wrap environment variables of each plugin into closure
   */
  private wrapEnvProvider(plugin: YamPlugin, handlerFunc: unknown, jsonPath: string): OperateFunction<unknown> {
    const envIsolationBackup = new Map<string, string | undefined>()
    plugin.environmentVars.forEach((v, k) => {
      envIsolationBackup.set(k, process.env[k])
      process.env[k] = v
    })
    return async (...args: unknown[]) => {
      try {
        await (handlerFunc as OperateFunction<unknown>).apply({}, args)
      } catch (ex) {
        (args[0] as PlanContext).log.error(`plugin ${plugin.name} failed during plan stage when resolving ${jsonPath}`, ex)
        throw ex
      } finally {
        envIsolationBackup.forEach((v, k) => {
          process.env[k] = v
        })
      }
    }
  }

  /**
   * class that implement 'operate' interface, create a instance and then wrap the function
   */
  private wrapClassStyleOperator(handlerFuncClass: ObjectConstructor): unknown {
    const operateFunc = (handlerFuncClass.prototype as Operator<unknown>).operate
    return (() => {
      const instance = new handlerFuncClass()
      return async (...args: unknown[]) => {
        await operateFunc.apply(instance, args)
      }
    })()
  }

}

export type SchemaHandlerFunc = {
  jsonSchema: unknown, handlers: MergedHandler[]
}

export type MergedHandler = {
  matcher: string,
  handlers: { pluginName: string, func: OperateFunction<unknown> }[]
}