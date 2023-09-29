import { handler } from '../../src/lambdas/redirector'

describe('redirector', () => {
  it('should 302 users to the configured destination, preserving path and query string', async () => {
    const env = Buffer.from(JSON.stringify({ destination: 'https://google.com' }), 'utf-8').toString('base64')
    const result = (await handler({ headers: { env }, rawQueryString: 'a=b&c=d', rawPath: '/path' } as any)) as any
    expect(result.statusCode).toBe(302)
    expect(result.headers.location).toBe('https://google.com/path?a=b&c=d')
  })
})
