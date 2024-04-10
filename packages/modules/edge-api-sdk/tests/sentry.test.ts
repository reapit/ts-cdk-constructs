import { enableFetchMocks } from 'jest-fetch-mock'
import fetchMock from 'jest-fetch-mock'
enableFetchMocks()

import { JSONRequest } from '../src'
import { init } from '../src/sentry/sentry'
import { generateCloudfrontRequest } from './logger.test'
import { LogEntry, LogPayload } from '../src/logger'

const generateLogPayload = (entries: LogEntry[]): LogPayload => {
  const event = generateCloudfrontRequest({})
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
    body: {},
    meta: {
      event,
      functionName: 'function-name',
      functionVersion: 'function-version',
      invocationId: 'invocation-id',
      sessionId: 'session-id',
    },
  }

  return {
    centralize: true,
    entries,
    event,
    functionName: 'functionName',
    functionVersion: 'functionVersion',
    invocationId: '',
    region: '',
    request,
    timestamp: new Date(0),
    sessionId: 'sessionId',
  }
}

describe('sentry logger transport', () => {
  beforeEach(() => {
    fetchMock.resetMocks()
  })
  it('should init', () => {
    init({
      dsn: 'https://asdf@qwerty.ingest.sentry.io/123456',
      environment: 'environment',
      release: 'release',
    })
  })

  it('should send exceptions to sentry', async () => {
    const report = init({
      dsn: 'https://asdf@qwerty.ingest.sentry.io/123456',
      environment: 'environment',
      release: 'release',
    })

    await report(
      generateLogPayload([
        {
          level: 'critical',
          message: 'the error message',
          timestamp: new Date(0),
          error: new Error('oh no'),
        },
      ]),
    )

    const [endpoint, reqInit] = fetchMock.mock.calls[0]
    expect(endpoint).toBe('https://qwerty.ingest.sentry.io/api/123456/envelope/?sentry_key=asdf&sentry_version=7')
    expect(reqInit?.method).toBe('post')
    const [, eventType, exception] = (reqInit?.body as string)?.split('\n').map((str) => JSON.parse(str)) ?? []
    expect(eventType.type).toBe('event')
    const values = exception.exception.values
    expect(values[0].type).toEqual('Error')
    expect(values[0].value).toEqual('oh no')
  })

  it('should send prior log entries as breadcrumbs', async () => {
    const report = init({
      dsn: 'https://asdf@qwerty.ingest.sentry.io/123456',
      environment: 'environment',
      release: 'release',
    })

    await report(
      generateLogPayload([
        {
          level: 'info',
          message: 'something interesting here',
          timestamp: new Date(0),
        },
        {
          level: 'critical',
          message: 'the error message',
          timestamp: new Date(1),
          error: new Error('oh no'),
        },
      ]),
    )
    const [, reqInit] = fetchMock.mock.calls[0]
    const [, , exception] = (reqInit?.body as string)?.split('\n').map((str) => JSON.parse(str)) ?? []
    expect(exception.breadcrumbs).toEqual([
      { level: 'info', message: 'something interesting here', timestamp: 0 },
      { level: 'fatal', message: 'the error message', timestamp: 1 },
    ])
  })
})
