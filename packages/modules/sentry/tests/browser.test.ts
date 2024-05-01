import fetchMock, { enableFetchMocks } from 'jest-fetch-mock'
enableFetchMocks()

import { initBrowserSentry } from '../src/browser'
import { initBreadcrumbIntegration } from '../src/browser-breadcrumb-integration'
import { Breadcrumb } from '@sentry/types'

describe('browser', () => {
  beforeEach(() => {
    fetchMock.resetMocks()
  })

  it('should init', () => {
    initBrowserSentry({
      componentName: 'frontend',
      dsn: 'https://asdf@qwerty.ingest.sentry.io/123456',
      environment: 'testing',
      release: 'sentry-release',
      sessionId: 'session-id',
    })
  })

  describe('sendError', () => {
    it('should send an error to sentry', async () => {
      const { sendError } = initBrowserSentry({
        componentName: 'frontend',
        dsn: 'https://asdf@qwerty.ingest.sentry.io/123456',
        environment: 'testing',
        release: 'sentry-release',
        sessionId: 'session-id',
      })

      await sendError(new Error('oh no'))

      const [endpoint, reqInit] = fetchMock.mock.calls[0]
      expect(endpoint).toBe('https://qwerty.ingest.sentry.io/api/123456/envelope/?sentry_key=asdf&sentry_version=7')
      expect(reqInit?.method).toBe('post')
      const [, eventType, exception] = (reqInit?.body as string)?.split('\n').map((str) => JSON.parse(str)) ?? []
      expect(eventType.type).toBe('event')
      const values = exception.exception.values
      expect(values[0].type).toEqual('Error')
      expect(values[0].value).toEqual('oh no')
    })
  })
})

describe('browser breadcrumb integration', () => {
  it('should init', () => {
    const breadcrumbs: Breadcrumb[] = []
    initBreadcrumbIntegration({ breadcrumbs })
  })
})
