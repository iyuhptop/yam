import { MainOperator } from '../main'
import { EngineConfig, YamPlugin } from '../types'
import * as path from 'path'
const MockedK8SEnv = [{ name: 'dev:us-east-1', stack: 'dev', envTag: 'us-east-1', kubeConfContextName: 'minukube', kubeConfPath: '~/.kube/config' }]
const MockedPlugin: YamPlugin = {
  name: 'mock-plugin',
  version: '1.0.0',
  builtIn: false,
  enable: true,
  directory: path.join(__dirname, 'mock-plugin'),
  environmentVars: new Map<string, string>()
}
const MockedEngineConfig: EngineConfig = {
  plugins: [MockedPlugin],
  clientConf: {
    lockType: 'k8s',
    planStoreType: 'local-file'
  }
}

test("operate process should work", async () => {
  const operator = new MainOperator()

  const cmdParams = new Map<string, string>()
  cmdParams.set('version', '1.0.0')

  await operator.operate({
    workingDir: path.join(__dirname, '/mock-yam'),
    runMode: 'plan-apply',
    cmdParams,
    clusters: MockedK8SEnv,
    engine: MockedEngineConfig
  })
})