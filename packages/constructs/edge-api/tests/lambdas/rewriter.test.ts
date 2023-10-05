import { CloudFrontHeaders, CloudFrontResponseEvent } from 'aws-lambda'
import { handler } from '../../src/lambdas/rewriter'

const createEvent = ({
  location,
  cookies,
  host,
}: {
  location?: string
  cookies?: string[]
  host: string
}): CloudFrontResponseEvent => {
  const headers: CloudFrontHeaders = {}
  if (location) {
    headers['location'] = [
      {
        key: 'location',
        value: location,
      },
    ]
  }
  if (cookies) {
    headers['set-cookie'] = cookies.map((cookie) => ({
      key: 'set-cookie',
      value: cookie,
    }))
  }
  return {
    Records: [
      {
        cf: {
          config: {
            distributionDomainName: '',
            distributionId: '',
            eventType: 'viewer-response',
            requestId: '',
          },
          request: {
            clientIp: '',
            headers: {
              host: [
                {
                  value: host,
                  key: 'host',
                },
              ],
            },
            method: 'get',
            querystring: '',
            uri: '',
          },
          response: {
            status: '',
            statusDescription: '',
            headers,
          },
        },
      },
    ],
  }
}

describe('cdk-cookie-rewriter', () => {
  it('should do nothing for normal requests', async () => {
    const input = createEvent({
      host: 'google.com',
    })
    const output = await handler(input)
    expect(output).toStrictEqual(input.Records[0].cf.response)
  })
  it('should do nothing to normal cookies', async () => {
    const input = createEvent({
      host: 'google.com',
      cookies: ['yummy_cookie=choco', 'tasty_cookie=strawberry'],
    })

    const output = await handler(input)
    expect(output).toStrictEqual(input.Records[0].cf.response)
  })
  it('should rewrite domains on cookies that have them', async () => {
    const input = createEvent({
      host: 'google.com',
      cookies: ['yummy_cookie=choco; Domain=mozilla.org', 'tasty_cookie=strawberry'],
    })

    const output = await handler(input)
    if (!output?.headers) {
      throw new Error('no output headers')
    }
    expect(output.headers['set-cookie'][0].value).toBe('yummy_cookie=choco; Domain=google.com')
    expect(output.headers['set-cookie'][1].value).toBe('tasty_cookie=strawberry')
  })
  it('should not change the location header if its normal', async () => {
    const input = createEvent({
      host: 'google.com',
      location: 'https://google.com/go',
    })

    const output = await handler(input)
    if (!output?.headers) {
      throw new Error('no output headers')
    }
    expect(output.headers['location'][0].value).toBe('https://google.com/go')
  })
  it('should change the location header if it ends with example.org', async () => {
    const input = createEvent({
      host: 'google.com',
      location: 'https://google.example.org/go',
    })

    const output = await handler(input)
    if (!output?.headers) {
      throw new Error('no output headers')
    }
    expect(output.headers['location'][0].value).toBe('https://google.com/go')
  })
  it('should preserve the paths and query strings on rewritten location headers', async () => {
    const input = createEvent({
      host: 'google.com',
      location: 'https://google.example.org/go?query=string&another=thing',
    })

    const output = await handler(input)
    if (!output?.headers) {
      throw new Error('no output headers')
    }
    expect(output.headers['location'][0].value).toBe('https://google.com/go?query=string&another=thing')
  })

  it('should handle a real event', async () => {
    const input = {
      Records: [
        {
          cf: {
            config: {
              distributionDomainName: 'd3c3p9us6o44iu.cloudfront.net',
              distributionId: 'E3DA8WGOFC9FPR',
              eventType: 'viewer-response',
              requestId: 'zVSJqFW5ee_CZ_Sja7lmar6vCKuAlY_bJk0W5jcIG0Gc6LLWLcZq6A==',
            },
            request: {
              clientIp: '1.1.1.1',
              headers: {
                host: [{ key: 'Host', value: 'something.com' }],
                'user-agent': [{ key: 'User-Agent', value: 'curl/7.88.1' }],
                accept: [{ key: 'accept', value: '*/*' }],
              },
              method: 'GET',
              querystring: '',
              uri: '/',
            },
            response: {
              headers: {
                date: [{ key: 'Date', value: 'Wed, 28 Jun 2023 13:34:23 GMT' }],
                'set-cookie': [
                  {
                    key: 'Set-Cookie',
                    value: 'XSRF-TOKEN=asdf; Path=/; Secure; HttpOnly; SameSite=Lax',
                  },
                ],
                'x-amz-cognito-request-id': [
                  { key: 'x-amz-cognito-request-id', value: '1750236f-2dbf-4f05-8721-02226e1940d1' },
                ],
                'x-content-type-options': [{ key: 'X-Content-Type-Options', value: 'nosniff' }],
                'x-xss-protection': [{ key: 'X-XSS-Protection', value: '1; mode=block' }],
                'cache-control': [{ key: 'Cache-Control', value: 'no-cache, no-store, max-age=0, must-revalidate' }],
                pragma: [{ key: 'Pragma', value: 'no-cache' }],
                expires: [{ key: 'Expires', value: '0' }],
                'strict-transport-security': [
                  { key: 'Strict-Transport-Security', value: 'max-age=31536000 ; includeSubDomains' },
                ],
                'x-frame-options': [{ key: 'X-Frame-Options', value: 'DENY' }],
                server: [{ key: 'Server', value: 'Server' }],
                'content-language': [{ key: 'Content-Language', value: 'en-US' }],
                'content-type': [{ key: 'Content-Type', value: 'text/html;charset=UTF-8' }],
                'transfer-encoding': [{ key: 'Transfer-Encoding', value: 'chunked' }],
              },
              status: '200',
              statusDescription: 'OK',
            },
          },
        },
      ],
    }
    const output = await handler(input as CloudFrontResponseEvent)
    expect(output).toStrictEqual(input.Records[0].cf.response)
  })
})
