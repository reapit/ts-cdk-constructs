import fetchMock, { enableFetchMocks } from 'jest-fetch-mock'
enableFetchMocks()

import { initBrowserSentry } from '../src/browser'

describe('edge-api-sentry-logger', () => {
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
})
