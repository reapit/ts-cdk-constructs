import { describe, expect } from '@jest/globals'
import { CloudFrontHeaders, CloudFrontRequestEvent, CloudFrontResultResponse } from 'aws-lambda'
import { jsonRequestHandler, JSONRequest, JSONResponse } from '../src'

process.env.AWS_REGION = 'eu-west-2'
const generateCloudfrontRequest = ({
  headers = {
    host: [{ key: 'host', value: 'google.com' }],
  },
  method = 'GET',
  querystring = '',
  uri,
  body,
  env,
}: {
  headers?: CloudFrontHeaders
  method?: string
  querystring?: string
  uri: string
  body?: string
  env?: any
}) => {
  const event: CloudFrontRequestEvent = {
    Records: [
      {
        cf: {
          config: {
            distributionDomainName: 'asdf',
            distributionId: 'asdf',
            eventType: 'origin-request',
            requestId: '1234',
          },
          request: {
            clientIp: '1.1.1.1',
            headers,
            method,
            querystring,
            uri,
            origin: {
              s3: {
                authMethod: 'origin-access-identity',
                domainName: '',
                path: '',
                region: '',
                customHeaders: env
                  ? {
                      env: [{ key: 'env', value: JSON.stringify(env) }],
                    }
                  : {},
              },
            },
            body: body
              ? {
                  action: 'replace',
                  encoding: 'text',
                  inputTruncated: false,
                  data: body,
                }
              : undefined,
          },
        },
      },
    ],
  }
  return event
}

describe('edge-api-sdk', () => {
  describe('jsonRequestHandler', () => {
    it('should run the handler', async () => {
      // const response: JSONResponse = {}
      const handler = jest.fn().mockResolvedValue({})
      await jsonRequestHandler(handler)(
        generateCloudfrontRequest({
          uri: '/',
        }),
      )
      expect(handler).toBeCalledTimes(1)
    })

    it('should call the handler with the correct object', async () => {
      // const response: JSONResponse = {}
      const handler = jest.fn().mockResolvedValue({})
      await jsonRequestHandler(handler)(
        generateCloudfrontRequest({
          uri: '/',
        }),
      )
      const request: JSONRequest<any, any> = {
        env: {},
        host: 'google.com',
        headers: {
          host: ['google.com'],
        },
        method: 'GET',
        path: '/',
        region: 'eu-west-2',
        cookies: [],
      }
      expect(handler).toHaveBeenCalledWith(request)
    })

    it('should return the correct object', async () => {
      const response: JSONResponse = {
        body: { something: 'here' },
        headers: {},
        status: 200,
      }
      const handler = jest.fn().mockResolvedValue(response)
      const result = await jsonRequestHandler(handler)(
        generateCloudfrontRequest({
          uri: '/authorize',
        }),
      )
      const resultEvent: CloudFrontResultResponse = {
        status: '200',
        headers: {
          'content-type': [
            {
              key: 'content-type',
              value: 'application/json',
            },
          ],
        },
        bodyEncoding: 'text',
        body: JSON.stringify({ something: 'here' }),
      }
      expect(result).toEqual(resultEvent)
    })

    it('redirects - should return the correct object', async () => {
      const response: JSONResponse = {
        headers: {
          location: 'https://google.com',
        },
        status: 302,
      }
      const handler = jest.fn().mockResolvedValue(response)
      const result = await jsonRequestHandler(handler)(
        generateCloudfrontRequest({
          uri: '/authorize',
        }),
      )
      const resultEvent: CloudFrontResultResponse = {
        status: '302',
        headers: {
          location: [
            {
              key: 'location',
              value: 'https://google.com',
            },
          ],
        },
      }
      expect(result).toEqual(resultEvent)
    })

    describe('querystring parsing', () => {
      it('should parse the querystring correctly', async () => {
        const handler = jest.fn().mockResolvedValue({})
        await jsonRequestHandler(handler)(
          generateCloudfrontRequest({
            uri: '/',
            querystring: 'asdf=1&qwerty=2&ghjkl=3',
          }),
        )
        const request: JSONRequest<any, any> = {
          headers: {
            host: ['google.com'],
          },
          env: {},
          host: 'google.com',
          method: 'GET',
          path: '/',
          query: {
            asdf: '1',
            qwerty: '2',
            ghjkl: '3',
          },
          region: 'eu-west-2',
          cookies: [],
        }
        expect(handler).toHaveBeenCalledWith(request)
      })
      it('should cope with no querystring', async () => {
        const handler = jest.fn().mockResolvedValue({})
        await jsonRequestHandler(handler)(
          generateCloudfrontRequest({
            uri: '/',
          }),
        )
        const request: JSONRequest<any, any> = {
          headers: {
            host: ['google.com'],
          },
          env: {},
          host: 'google.com',
          method: 'GET',
          path: '/',
          region: 'eu-west-2',
          cookies: [],
        }
        expect(handler).toHaveBeenCalledWith(request)
      })
    })

    describe('env parsing', () => {
      it('should decode the custom header correctly', async () => {
        const handler = jest.fn().mockResolvedValue({})
        const env = {
          aKey: 'avalue',
          something: 'else',
          completely: 'different',
        }
        await jsonRequestHandler(handler)(
          generateCloudfrontRequest({
            uri: '/',
            env,
          }),
        )
        const request: JSONRequest<any, any> = {
          env,
          headers: {
            host: ['google.com'],
          },
          method: 'GET',
          host: 'google.com',
          path: '/',
          region: 'eu-west-2',
          cookies: [],
        }
        expect(handler).toHaveBeenCalledWith(request)
      })
    })

    describe('error handling', () => {
      it('should allow errors to be thrown', async () => {
        const message = 'asdfg'
        const ce = jest.spyOn(console, 'error').mockImplementation(() => {})
        const cl = jest.spyOn(console, 'log').mockImplementation(() => {})
        const handler = jest.fn().mockRejectedValue(new Error(message))
        const result = await jsonRequestHandler(handler)(
          generateCloudfrontRequest({
            uri: '/',
            env: {},
          }),
        )
        const res = JSON.parse((result as CloudFrontResultResponse).body || '')
        expect(res).toHaveProperty('status', 'error')
        expect(res).toHaveProperty('error')
        expect(res.error).toHaveProperty('message', message)

        expect(ce).toHaveBeenCalled()
        expect(cl).toHaveBeenCalled()
        ce.mockRestore()
        cl.mockRestore()
      })
    })
  })
})
