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

  integ.it('/redirect-me - should redirect to google', async () => {
    const endpoint = integ.outputs.output
    const res = await fetch(`${endpoint}/redirect-me`, {
      redirect: 'manual',
    })
    expect(res.status).toBe(302)
    const locHeader = res.headers.get('location')
    expect(locHeader).not.toBeNull()
    expect(locHeader).toBe('https://google.com/redirect-me')
  })

  integ.it('/api - should have the custom header', async () => {
    const endpoint = integ.outputs.output
    const res = await fetch(`${endpoint}/api`)
    expect(res.headers.get('X-CUSTOM-HEADER')).toBe('CUSTOM-HEADER-VALUE')
  })

  integ.it('/get - should set the Server header to be CERN NextStep', async () => {
    const endpoint = integ.outputs.output
    const res = await fetch(`${endpoint}/get`)
    expect(res.headers.get('Server')).toBe('CERN-NextStep-WorldWideWeb.app/1.1  libwww/2.07')
  })

  integ.it('/bucket - should set the X-FRAME-OPTIONS header to be DENY', async () => {
    const endpoint = integ.outputs.output
    const res = await fetch(`${endpoint}/bucket`)
    expect(res.headers.get('X-FRAME-OPTIONS')).toBe('DENY')
  })

  integ.it('root - should set the Server header to be @reapit-cdk/edge-api', async () => {
    const endpoint = integ.outputs.output
    const res = await fetch(endpoint)
    expect(res.headers.get('Server')).toBe('@reapit-cdk/edge-api')
  })

  const testHttpsRedirect = async (httpsEndpoint: string) => {
    const httpEndpoint = httpsEndpoint.replace('https://', 'http://')
    const res = await fetch(httpEndpoint)
    expect(res.status).toBe(301)
    expect(res.headers.get('location')).toBe(httpsEndpoint)
  }

  integ.it('should redirect http to https - root', async () => {
    const httpsEndpoint = integ.outputs.output

    await testHttpsRedirect(`${httpsEndpoint}`)
  })
  integ.it('should redirect http to https - /bucket', async () => {
    const httpsEndpoint = integ.outputs.output

    await testHttpsRedirect(`${httpsEndpoint}/bucket`)
  })
  integ.it('should redirect http to https - /api', async () => {
    const httpsEndpoint = integ.outputs.output

    await testHttpsRedirect(`${httpsEndpoint}/api`)
  })
  integ.it('should redirect http to https - /get', async () => {
    const httpsEndpoint = integ.outputs.output

    await testHttpsRedirect(`${httpsEndpoint}/get`)
  })
  integ.it('should redirect http to https - /redirect-me', async () => {
    const httpsEndpoint = integ.outputs.output

    await testHttpsRedirect(`${httpsEndpoint}/redirect-me`)
  })
})
