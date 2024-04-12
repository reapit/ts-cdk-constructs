import { enableFetchMocks } from 'jest-fetch-mock'
import fetchMock from 'jest-fetch-mock'
enableFetchMocks()

import { JSONRequest } from '../src'
import { init } from '../src/sentry/sentry'
import { generateCloudfrontRequest } from './logger.test'
import { LogEntry, LogPayload } from '../src/logger'
import { Event } from '@sentry/types'

const generateLogPayload = (entries: LogEntry[]): LogPayload => {
  const event = generateCloudfrontRequest({})
  const request: JSONRequest<any, any> = {
    env: {
      sentryDsn: 'https://asdf@qwerty.ingest.sentry.io/123456',
      sentryRelease: 'sentry-release',
    },
    headers: {
      host: ['google.com'],
    },
    method: 'GET',
    host: 'google.com',
    path: '/',
    query: {
      a: 'b',
    },
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
    functionName: 'function-name',
    functionVersion: 'function-version',
    invocationId: 'invocation-id',
    region: 'eu-west-2',
    request,
    timestamp: new Date(0),
    sessionId: 'session-id',
  }
}

describe('sentry logger transport', () => {
  beforeEach(() => {
    fetchMock.resetMocks()
  })
  it('should init', () => {
    const { request } = generateLogPayload([])
    init(request)
  })

  it('should send exceptions to sentry', async () => {
    const payload = generateLogPayload([
      {
        level: 'critical',
        message: 'the error message',
        timestamp: new Date(0),
        error: new Error('oh no'),
      },
    ])
    const report = init(payload.request)

    await report(payload)

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
    const payload = generateLogPayload([
      {
        level: 'info',
        message: 'something interesting here',
        timestamp: new Date(0),
      },
      {
        level: 'critical',
        message: 'the error message',
        timestamp: new Date(1000),
        error: new Error('oh no'),
      },
    ])
    const report = init(payload.request)

    await report(payload)
    const [, reqInit] = fetchMock.mock.calls[0]
    const [, , event] = (reqInit?.body as string)?.split('\n').map((str) => JSON.parse(str)) ?? []
    const ev = event as Event
    expect(ev.breadcrumbs).toEqual([
      { level: 'info', message: 'something interesting here', timestamp: 0 },
      { level: 'fatal', message: 'the error message', timestamp: 1 },
    ])
  })

  it('should add contextual information to the event', async () => {
    const payload = generateLogPayload([
      {
        level: 'info',
        message: 'something interesting here',
        timestamp: new Date(0),
      },
      {
        level: 'critical',
        message: 'the error message',
        timestamp: new Date(1000),
        error: new Error('oh no'),
      },
    ])
    const report = init(payload.request)
    await report(payload)
    const [, reqInit] = fetchMock.mock.calls[0]
    const [, , event] = (reqInit?.body as string)?.split('\n').map((str) => JSON.parse(str)) ?? []
    const ev = event as Event
    expect(ev.environment).toBe('google.com')
    expect(ev.tags).toEqual({
      sessionId: 'session-id',
      functionName: 'function-name',
    })
    expect(ev.release).toBe('sentry-release')
    expect(ev.contexts?.invocation).toEqual({
      functionName: 'function-name',
      functionVersion: 'function-version',
      invocationId: 'invocation-id',
      region: 'eu-west-2',
    })
    expect(ev.request).toEqual({
      headers: {
        host: 'google.com',
      },
      method: 'GET',
      query_string: {
        a: 'b',
      },
      cookies: {},
      url: '/',
    })
  })
})
