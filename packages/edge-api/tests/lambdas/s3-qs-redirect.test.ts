import { CloudFrontHeaders, CloudFrontResponseEvent } from 'aws-lambda'
import { handler } from '../../src/lambdas/s3-qs-redirect'

const createEvent = ({
  location,
  status = '200',
  querystring = '',
}: {
  location?: string
  querystring?: string
  status?: string
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
  return {
    Records: [
      {
        cf: {
          config: {
            distributionDomainName: '',
            distributionId: '',
            eventType: 'origin-response',
            requestId: '',
          },
          request: {
            clientIp: '',
            headers: {
              host: [
                {
                  value: 'google.com',
                  key: 'host',
                },
              ],
            },
            method: 'get',
            querystring,
            uri: '',
          },
          response: {
            status,
            statusDescription: '',
            headers,
          },
        },
      },
    ],
  }
}

describe('s3-qs-redirect', () => {
  it('should do nothing for normal requests', async () => {
    const input = createEvent({})
    const output = await handler(input)
    expect(output).toStrictEqual(input.Records[0].cf.response)
  })
  it('should preserve querystring if a redirect response is returned', async () => {
    const input = createEvent({
      location: 'http://google.com',
      querystring: 'a=b&c=d',
      status: '302',
    })
    const output = await handler(input)
    if (!output?.headers) {
      throw new Error('no output headers')
    }
    expect(output.headers.location[0].value).toBe('http://google.com?a=b&c=d')
  })
})
