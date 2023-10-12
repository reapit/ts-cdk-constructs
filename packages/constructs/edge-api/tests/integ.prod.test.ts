import { IntegrationTest } from '@reapit-cdk/integration-tests'

import * as path from 'path'

describe('edge-api prod integration', () => {
  const integ = new IntegrationTest({
    stackFile: path.resolve(__dirname, './integ.stack.prod.ts'),
    stackName: 'edge-api-test-stack',
  })

  integ.it('root - should proxy', async () => {
    const endpoint = integ.outputs.output
    const res = await fetch(endpoint)
    const resTxt = await res.text()
    expect(resTxt).toContain('Example Domain')
  })

  integ.it('/bucket - should be bucket contents', async () => {
    const endpoint = integ.outputs.output
    const res = await fetch(`${endpoint}/bucket`)
    const resTxt = await res.text()
    expect(resTxt).toBe('<h1>it works!</h1>')
  })

  integ.it('/api - should run lambda and return env', async () => {
    const endpoint = integ.outputs.output
    const res = await fetch(`${endpoint}/api`)
    const resJson = await res.json()
    expect(resJson).toBeDefined()
    expect(resJson).toHaveProperty('aVariable', 'contents')
  })

  integ.it('/get - should proxy to httpbin', async () => {
    const endpoint = integ.outputs.output
    const res = await fetch(`${endpoint}/get`)
    const resJson = await res.json()
    expect(resJson).toBeDefined()
    expect(resJson).toHaveProperty('url', 'https://httpbin.org/get')
  })
})
