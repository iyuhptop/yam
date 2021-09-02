import { SchemaHandler } from '@yam/types'
import * as schema from './application.schema.json'
import configOperator from './handlers/config/config-operator'
import secretOperator from './handlers/config/secret-operator'
import deploymentOperator from './handlers/deploy/deployment-operator'

/**
 * Each application mod
 */
export default {
  name: 'application',
  schema,
  handlers: {
    // 'prepare.type=redis|redis-cluster': redisOperator,
    // 'prepare.type=mongo': mongoOperator,
    // 'prepare.type=helm': helmOperator,
    // 'prepare.type=terraform': terraformOperator,
    // 'prepare.type=pulumi': pulumiOperator,

    'config.type=configMap': configOperator,
    'config.type=secret': secretOperator,

    'deploy.type=deployment': deploymentOperator,
    // 'deploy.type=statefulset': statefulsetOperator,
    // 'deploy.type=daemonset': daemonsetOperator,
    // 'deploy.type=cronjob': cronjobOperator,

    // 'access.route': ingressOperator,

    // 'observe.monitor': serviceMonitorOperator,
    // 'observe.alert': alertRuleOperator,

    // 'scale.type=metrics': hpaOperator,
    // 'scale.type=cron': cronScalerOperator,
  }
} as SchemaHandler