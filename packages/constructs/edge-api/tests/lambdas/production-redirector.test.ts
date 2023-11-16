import { handler } from '../../src/lambdas/production-redirector'
import { genEvent } from './origin-selector.test'

describe('production-redirector', () => {
  it('should 302 users to the configured destination', async () => {
    const env = { destination: 'https://google.com' }
    const result = await handler(genEvent('https://something.com', env) as any)
    expect(result.status).toBe('302')
    expect(result.headers.location[0].value).toBe('https://google.com')
  })
})
