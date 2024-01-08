import { CloudFrontRequestEvent } from 'aws-lambda'
import { JSONRequest } from '../src'
import { LogPayload, createLogger } from '../src/logger'

const generateCloudfrontRequest = ({
  headers = {
    host: [{ key: 'host', value: 'google.com' }],
  },
  method = 'GET',
  querystring = '',
  uri,
  body = JSON.stringify('something'),
  env,
}: any): CloudFrontRequestEvent => {
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

const getLogger = (body: any = { password: 'user-password' }) => {
  const request: JSONRequest<any, any> = {
    env: {},
    headers: {
      host: ['google.com'],
    },
    method: 'GET',
    host: 'google.com',
    path: '/',
    region: 'eu-west-2',
    cookies: [],
    body,
    meta: {
      event: generateCloudfrontRequest({}),
      functionName: 'function-name',
      functionVersion: 'function-version',
      invocationId: 'invocation-id',
      sessionId: 'session-id',
    },
  }
  const logger = createLogger(request)
  return logger
}

type ConsoleMethod = jest.SpyInstance<void, [message?: any, ...optionalParams: any[]], any>

describe('logger', () => {
  let consoleWarn: ConsoleMethod
  let consoleError: ConsoleMethod
  let consoleInfo: ConsoleMethod
  let consoleLog: ConsoleMethod
  beforeEach(() => {
    consoleWarn = jest.spyOn(global.console, 'warn').mockImplementation(() => {})
    consoleError = jest.spyOn(global.console, 'error').mockImplementation(() => {})
    consoleInfo = jest.spyOn(global.console, 'info').mockImplementation(() => {})
    consoleLog = jest.spyOn(global.console, 'log').mockImplementation(() => {})
  })
  afterEach(() => {
    consoleWarn.mockRestore()
    consoleError.mockRestore()
    consoleInfo.mockRestore()
    consoleLog.mockRestore()
  })
  it('should console warn', () => {
    const logger = getLogger()
    const str = 'oh no something went wrong'
    logger.warning(str)
    expect(consoleError).toHaveBeenCalledTimes(0)
    expect(consoleInfo).toHaveBeenCalledTimes(0)
    expect(consoleWarn).toHaveBeenCalledTimes(1)
    expect(consoleWarn).toHaveBeenCalledWith(str)
  })
  it('should console error', () => {
    const logger = getLogger()
    const str = 'oh no something went wrong'
    logger.error(str)
    expect(consoleInfo).toHaveBeenCalledTimes(0)
    expect(consoleWarn).toHaveBeenCalledTimes(0)
    expect(consoleError).toHaveBeenCalledTimes(1)
    expect(consoleError).toHaveBeenCalledWith(str)
  })
  it('should console info', () => {
    const logger = getLogger()
    const str = 'oh no something went wrong'
    logger.info(str)
    expect(consoleError).toHaveBeenCalledTimes(0)
    expect(consoleWarn).toHaveBeenCalledTimes(0)
    expect(consoleInfo).toHaveBeenCalledTimes(1)
    expect(consoleInfo).toHaveBeenCalledWith(str)
  })
  it('should console log the correct format of error when hitting an error', () => {
    const logger = getLogger()
    logger.info('a')
    logger.info('b')
    logger.info('c')
    logger.error({
      error: {
        name: 'Error',
        message: 'something went wrong',
      },
    })
    logger.info('d')
    logger.info('e')
    expect(consoleLog).toHaveBeenCalledTimes(1)
    const format = JSON.parse(consoleLog.mock.calls[0][0]) as LogPayload
    expect(format.centralize).toBe(true)
    expect(format.entries).toHaveLength(4)
    expect(format.entries[0].message).toBe('a')
    expect(format.entries[1].message).toBe('b')
    expect(format.entries[2].message).toBe('c')
    expect(format.entries[3].message).toBe("{ error: { name: 'Error', message: 'something went wrong' } }")
    expect(format.entries[3].error?.message).toBe('something went wrong')

    expect(format.functionName).toBe('function-name')
    expect(format.functionVersion).toBe('function-version')
    expect(format.invocationId).toBe('invocation-id')
    expect(format.sessionId).toBe('session-id')
    expect(format.region).toBe('eu-west-2')
    expect((format.event as CloudFrontRequestEvent).Records[0].cf.config.distributionDomainName).toBe('asdf')
    expect(format.request.host).toBe('google.com')
  })

  it('should scrub password from the request body and blank out the event completely', () => {
    const logger = getLogger()
    logger.error({
      error: {
        name: 'Error',
        message: 'something went wrong',
      },
    })
    expect(consoleLog).toHaveBeenCalledTimes(1)
    const format = JSON.parse(consoleLog.mock.calls[0][0]) as LogPayload
    expect(format.request.body).toHaveProperty('password')
    expect((format.request.body as any).password).toBe('request-body-entry-removed')
    expect((format.event as CloudFrontRequestEvent).Records[0].cf.request.body).toBeUndefined()
  })

  it('should not scrub anything from the request body and blank out the event completely if no password', () => {
    const logger = getLogger({
      something: 'else',
    })
    logger.error({
      error: {
        name: 'Error',
        message: 'something went wrong',
      },
    })
    expect(consoleLog).toHaveBeenCalledTimes(1)
    const format = JSON.parse(consoleLog.mock.calls[0][0]) as LogPayload
    expect(format.request.body).toHaveProperty('something')
    expect((format.request.body as any).something).toBe('else')
    expect((format.event as CloudFrontRequestEvent).Records[0].cf.request.body).not.toBeUndefined()
  })
})
