import * as _ from 'lodash'
import * as pino from 'pino'

/**
 * Split by multiple delimiter, including: ',' ':' ';' and whitespace
 * 
 * @param str input string
 * @returns split string array
 */
export const splitAndTrim = (str: string) => {
  return _.split(str, /[\/;:,\s]+/)
}

/**
 * Create logger for different sub-module
 * 
 * @param name logger name1
 * @returns Pino Logger
 */
export const createLogger = (name: string) => {
  return pino({
    name,
    level: !!process.env.DEBUG ? 'debug' : 'info',
    prettyPrint: true
  })
}