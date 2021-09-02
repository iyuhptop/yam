import { IApplicationModel, PlanContext, SchemaHandler } from '@yam/types'
import type { YamPlugin } from '../types'
import { createLogger } from '../util'

/**
 * 
 */
export default class PluginSchemaHandler {

  private log = createLogger('schema-handler')

  buildSchemaAndHandlers(plugins: YamPlugin[], workingDir: string, currentYam: IApplicationModel) {
    const mergedJsonSchema: object = {}
    const mergedHandlers: MergedHandler[] = []

    for (const plugin of plugins) {
      if (!plugin.enable) {
        continue
      }
      const schemaName = currentYam.schema.split('/')[0].trim()
      if (plugin.applyTo?.indexOf(schemaName) === -1) {
        continue
      } else {
        this.log.info(`enable plugin: ${plugin.name}:${plugin.version}`)
      }

      // dynamic import plugin codes in plugin directory
      !plugin.builtIn && module.paths.unshift(plugin.directory)
      const pluginModule = require(plugin.name)
      const { name, schema, handlers } = pluginModule.default as SchemaHandler
      !plugin.builtIn && module.paths.shift()

      // schema is the json schema for validating currentYam object, merge all plugins schema
      this.mergeJsonSchema(schema, mergedJsonSchema)

      // merge all plugins handlers, build handler array
      for (let objPathMatcher in handlers) {
        let handlerFunc = handlers[objPathMatcher] as Function
        if (handlerFunc instanceof Function) {
          if (handlerFunc.prototype && handlerFunc.prototype.operate) {
            // class that implement 'operate' interface
            this.log.debug(`find operator class of ${name}: ${handlerFunc.name}`)
            handlerFunc = (() => {
              const instance = new (handlerFunc as FunctionConstructor)()
              return async (plan: PlanContext, params: unknown) => {
                await (handlerFunc.prototype.operate as Function).call(instance, plan, params)
              }
            })()
          } else {
            // pure function
            this.log.debug(`find operator function of ${name}: ${handlerFunc.name}()`)
          }

          // isolate running environment vars to avoid key enclosure, and log exception
          const wrapped = (() => {
            const envIsolateBackup = new Map<string, string | undefined>()
            plugin.environmentVars.forEach((v, k) => {
              envIsolateBackup.set(k, process.env[k])
              process.env[k] = v
            })
            return async (plan: PlanContext, params: unknown) => {
              try {
                await handlerFunc.call(null, plan, params)
              } catch (ex) {
                plan.log.error(`plugin ${name} error during plan stage when resolving ${objPathMatcher}`, ex)
                throw ex
              } finally {
                envIsolateBackup.forEach((v, k) => {
                  process.env[k] = v
                })
              }
            }
          })()

          // merge the function and plugin schema into mergedHandlers
          const res = mergedHandlers.find((h) => { h.matcher === objPathMatcher })
          const finalHandler = { pluginName: name, func: wrapped }
          if (res) {
            res.handlers.push(finalHandler)
          } else {
            mergedHandlers.push({ matcher: objPathMatcher, handlers: [finalHandler] })
          }
        } else {
          this.log.warn(`wrong handler definition for schema path ${objPathMatcher}`)
        }
      }
    }
    return { jsonSchema: mergedJsonSchema, handlers: mergedHandlers }
  }

  private mergeJsonSchema(source: unknown, target: unknown) {
    // TODO
  }
}

export type MergedHandler = {
  matcher: string,
  handlers: { pluginName: string, func: Function }[]
}