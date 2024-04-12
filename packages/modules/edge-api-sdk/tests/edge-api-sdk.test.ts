/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, expect } from '@jest/globals'
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  CloudFrontHeaders,
  CloudFrontRequestEvent,
  CloudFrontResultResponse,
} from 'aws-lambda'
import { jsonRequestHandler, RedirectionResponse, formRequestHandler, requestHandler } from '../src'
import { Logger, LoggerConfig } from '../src/logger'

const mockLoggerInfo = jest.fn()
const mockLoggerError = jest.fn()
const mockLoggerPanic = jest.fn()
const mockLoggerFlush = jest.fn()

jest.mock('../src/logger', () => {
  return {
    Logger: jest.fn().mockImplementation(() => {
      return {
        info: mockLoggerInfo,
        error: mockLoggerError,
        panic: mockLoggerPanic,
        flush: mockLoggerFlush,
      }
    }),
  }
})

beforeEach(() => {
  //@ts-expect-error
  Logger.mockClear()
  mockLoggerInfo.mockClear()
  mockLoggerError.mockClear()
  mockLoggerPanic.mockClear()
  mockLoggerFlush.mockClear()
})

process.env.AWS_REGION = 'eu-west-2'

type RequestGeneratorParams = {
  headers?: CloudFrontHeaders
  method?: string
  querystring?: string
  uri: string
  body?: string
  env?: any
}
type ResponseGeneratorParams = CloudFrontResultResponse
type RequestGenerator = (params: RequestGeneratorParams) => CloudFrontRequestEvent | APIGatewayProxyEventV2
type ResponseGenerator = (params: ResponseGeneratorParams) => CloudFrontResultResponse | APIGatewayProxyResultV2

const cloudfrontResponseGenerator = (params: ResponseGeneratorParams): CloudFrontResultResponse => params
const apigatewayResponseGenerator = (params: ResponseGeneratorParams): APIGatewayProxyResultV2 => {
  const apigwHeaders: Record<string, string> = {}
  Object.values(params.headers ?? {})
    .flat()
    .forEach(({ key, value }) => {
      apigwHeaders[key ?? ''] = value
    })
  const res = {
    headers: apigwHeaders,
    isBase64Encoded: false,
    statusCode: parseInt(params.status, 10),
  }
  if (params.body) {
    return {
      ...res,
      body: params.body,
    }
  }
  return res
}

const strToBase64 = (str: string) => Buffer.from(str).toString('base64')

const generateApiGatewayRequest = ({
  headers = {
    host: [{ key: 'host', value: 'google.com' }],
  },
  method = 'GET',
  querystring = '',
  uri,
  body,
  env,
}: RequestGeneratorParams): APIGatewayProxyEventV2 => {
  const apigwHeaders: Record<string, string> = {
    env: strToBase64(JSON.stringify(env ?? {})),
  }
  Object.entries(headers).forEach(([key, values]) => {
    apigwHeaders[key] = values.map(({ value }) => value).join(',')
  })

  return {
    isBase64Encoded: true,
    body: body ? strToBase64(body) : undefined,
    headers: apigwHeaders,
    rawPath: uri,
    rawQueryString: querystring,
    routeKey: `${method} ${uri}`,
    version: '2',
    cookies: [],
    requestContext: {
      accountId: '',
      apiId: '',
      domainName: '',
      domainPrefix: '',
      requestId: '',
      routeKey: `${method} ${uri}`,
      stage: '$default',
      time: '',
      timeEpoch: 0,
      authentication: undefined,
      http: {
        method,
        path: uri,
        protocol: 'https',
        sourceIp: '1.1.1.1',
        userAgent: '',
      },
    },
  }
}

export const generateCloudfrontRequest = ({
  headers = {
    host: [{ key: 'host', value: 'google.com' }],
  },
  method = 'GET',
  querystring = '',
  uri,
  body,
  env,
}: RequestGeneratorParams): CloudFrontRequestEvent => {
  return {
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
}

const testEventType = (generateRequest: RequestGenerator, generateResponse: ResponseGenerator) => {
  Object.entries({ jsonRequestHandler, requestHandler, formRequestHandler }).forEach(([name, func]: [string, any]) => {
    describe(name, () => {
      it('should run the handler', async () => {
        const handler = jest.fn().mockResolvedValue({})
        await func(handler)(
          generateRequest({
            uri: '/',
          }),
          {},
        )
        expect(handler).toBeCalledTimes(1)
      })

      describe('cookie parsing', () => {
        it('should parse cookies correctly', async () => {
          const handler = jest.fn().mockResolvedValue({})
          await func(handler)(
            generateRequest({
              uri: '/',
              headers: {
                cookie: [
                  {
                    value: 'a=b;c=d',
                    key: 'Cookie',
                  },
                ],
              },
            }),
            {},
          )

          expect(handler.mock.calls[0][0].cookies).toStrictEqual(['a=b', 'c=d'])
        })
      })
      describe('querystring parsing', () => {
        it('should parse the querystring correctly', async () => {
          const handler = jest.fn().mockResolvedValue({})
          await func(handler)(
            generateRequest({
              uri: '/',
              querystring: 'asdf=1&qwerty=2&ghjkl=3',
            }),
            {},
          )
          const request = {
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
          const { logger, meta, ...rest } = handler.mock.lastCall[0]
          expect(rest).toEqual(request)
        })
        it('should cope with no querystring', async () => {
          const handler = jest.fn().mockResolvedValue({})
          await func(handler)(
            generateRequest({
              uri: '/',
            }),
            {},
          )
          const request = {
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
          const { logger, meta, ...rest } = handler.mock.lastCall[0]
          expect(rest).toEqual(request)
        })
      })

      it('redirects - should return the correct object', async () => {
        const response: RedirectionResponse = {
          headers: {
            location: 'https://google.com',
          },
          status: 302,
        }
        const handler = jest.fn().mockResolvedValue(response)
        const result = await func(handler)(
          generateRequest({
            uri: '/authorize',
          }),
          {},
        )
        const resultEvent = generateResponse({
          status: '302',
          headers: {
            location: [
              {
                key: 'location',
                value: 'https://google.com',
              },
            ],
          },
        })
        expect(result).toEqual(resultEvent)
      })

      describe('env parsing', () => {
        it('should decode the custom header correctly', async () => {
          const handler = jest.fn().mockResolvedValue({})
          const env = {
            aKey: 'avalue',
            something: 'else',
            completely: 'different',
          }
          await func(handler)(
            generateRequest({
              uri: '/',
              env,
            }),
            {},
          )
          const request = {
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
          const { logger, meta, ...rest } = handler.mock.lastCall[0]
          expect(rest).toEqual(request)
        })
      })

      describe('error handling', () => {
        it('should allow errors to be thrown', async () => {
          const message = 'asdfg'
          const handler = jest.fn().mockRejectedValue(new Error(message))
          const result = await func(handler)(
            generateRequest({
              uri: '/',
              env: {},
            }),
            {},
          )
          const res = JSON.parse((result as CloudFrontResultResponse).body ?? '')
          expect(res).toHaveProperty('status', 'error')
          expect(res).toHaveProperty('error')
          expect(res.error).toHaveProperty('message', message)

          expect(mockLoggerError).toHaveBeenCalled()
        })

        it('should flush the logger after an error is thrown', async () => {
          const handler = jest.fn().mockRejectedValue(new Error(''))
          await func(handler)(
            generateRequest({
              uri: '/',
              env: {},
            }),
            {},
          )

          expect(mockLoggerError).toHaveBeenCalled()
          expect(mockLoggerFlush).toHaveBeenCalled()
        })
      })

      describe('config resolution', () => {
        it('should pass handlerConfig.loggerConfig to the logger', async () => {
          const handler = jest.fn().mockResolvedValue({})

          const loggerConfig: LoggerConfig = {
            transports: [],
          }

          const request = generateRequest({
            uri: '/',
          })

          await func(handler, {
            loggerConfig,
          })(request, {})

          expect(Logger).toHaveBeenCalledWith(expect.any(Object), loggerConfig)
        })

        it('should run the resolver to get the handlerConfig if needed', async () => {
          const loggerConfig: LoggerConfig = {
            transports: [],
          }
          const handler = jest.fn().mockResolvedValue({})
          const handlerConfigResolver = jest.fn().mockReturnValue({
            loggerConfig,
          })

          const request = generateRequest({
            uri: '/',
          })

          await func(handler, handlerConfigResolver)(request, {})

          expect(Logger).toHaveBeenCalledWith(
            expect.objectContaining({
              path: '/',
              method: 'GET',
              host: 'google.com',
            }),
            loggerConfig,
          )
          expect(handlerConfigResolver).toHaveBeenCalledWith(
            expect.objectContaining({
              path: '/',
              method: 'GET',
              host: 'google.com',
            }),
          )
        })
      })
    })
  })
  describe('jsonRequestHandler', () => {
    describe('body parsing', () => {
      it('should parse the body correctly', async () => {
        const handler = jest.fn().mockResolvedValue({})
        const env = {
          aKey: 'avalue',
          something: 'else',
          completely: 'different',
        }
        await jsonRequestHandler(handler)(
          generateRequest({
            uri: '/',
            env,
            body: JSON.stringify({ something: 'here' }),
          }),
          {} as any,
        )
        const request = {
          env,
          headers: {
            host: ['google.com'],
          },
          method: 'GET',
          host: 'google.com',
          path: '/',
          region: 'eu-west-2',
          cookies: [],
          body: { something: 'here' },
        }
        const { logger, meta, ...rest } = handler.mock.lastCall[0]
        expect(rest).toEqual(request)
      })
    })
  })
  describe('formRequestHandler', () => {
    it('should parse the request body correctly', async () => {
      const handler = jest.fn().mockResolvedValue({})
      const env = {
        aKey: 'avalue',
        something: 'else',
        completely: 'different',
      }
      await formRequestHandler(handler)(
        generateRequest({
          uri: '/',
          env,
          body: new URLSearchParams({ something: 'here' }).toString(),
        }),
        {} as any,
      )
      const request = {
        env,
        headers: {
          host: ['google.com'],
        },
        method: 'GET',
        host: 'google.com',
        path: '/',
        region: 'eu-west-2',
        cookies: [],
        body: { something: 'here' },
      }
      const { logger, meta, ...rest } = handler.mock.lastCall[0]
      expect(rest).toEqual(request)
    })
  })
}

describe('edge-api-sdk', () => {
  describe('cloudfront events', () => {
    testEventType(generateCloudfrontRequest, cloudfrontResponseGenerator)
  })
  describe('api gateway v2 events', () => {
    testEventType(generateApiGatewayRequest, apigatewayResponseGenerator)
  })
})
