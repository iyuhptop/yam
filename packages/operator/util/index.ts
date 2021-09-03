import { Logger } from 'pino'
import * as _ from 'lodash'
import * as pino from 'pino'
import { JSON_PATH_PREFIX } from '../constants'

/**
 * Split by multiple delimiter, including: ',' ':' ';' and whitespace
 * 
 * @param str input string
 * @returns split string array
 */
export const splitAndTrim = (str: string): string[] => {
  return _.split(str, /[/;:,\s]+/)
}

/**
 * Create logger for different sub-module
 * 
 * @param name logger name1
 * @returns Pino Logger
 */
export const createLogger = (name: string): Logger => {
  return pino({
    name,
    level: process.env.DEBUG ? 'debug' : 'info',
    prettyPrint: true
  })
}

export const normalizeJsonPath = (expr: string, fetchParent?: boolean): string => {
  if (fetchParent) {
    // jsonpath-plus grammar, to fetch parent object
    expr += "^"
  }
  if (!expr.startsWith(JSON_PATH_PREFIX)) {
    expr = JSON_PATH_PREFIX + expr
  }
  return expr
}

export const mergeObject = (target: unknown, source: unknown, replaceArray?: boolean): unknown => {
  return _.mergeWith(target, source, ((objValue, srcValue) => {
    if (_.isArray(objValue)) {
      if (replaceArray) {
        // replace whole array
        return srcValue
      } else {
        // append array items by default
        return objValue.concat(srcValue)
      }
    }
    return
  }))
}