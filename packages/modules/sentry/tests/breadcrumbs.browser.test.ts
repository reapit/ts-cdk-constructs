const addClickKeypressInstrumentationHandler = jest.fn((fn) => fn)
const addHistoryInstrumentationHandler = jest.fn((fn) => fn)
const addXhrInstrumentationHandler = jest.fn((fn) => fn)
const addConsoleInstrumentationHandler = jest.fn((fn) => fn)
const addFetchInstrumentationHandler = jest.fn((fn) => fn)
const htmlTreeAsString = jest.fn(() => 'html-tree-as-string-output')
const getComponentName = jest.fn(() => 'get-component-name-output')
const dateTimestampInSeconds = jest.fn(() => 'date-timestamp-in-seconds-output')
const parseUrl = jest.fn(() => ({
  host: 'google.com',
  path: '/path',
  protocol: 'https',
  relative: '/path',
}))
const severityLevelFromString = jest.fn(() => 'severityLevelFromString')
const safeJoin = jest.fn((args: any[], delimiter: string) => args.join(delimiter))
const SENTRY_XHR_DATA_KEY = '__sentry_xhr_v3__'

jest.doMock('@sentry-internal/browser-utils', () => ({
  addClickKeypressInstrumentationHandler,
  addHistoryInstrumentationHandler,
  addXhrInstrumentationHandler,
  SENTRY_XHR_DATA_KEY,
}))
jest.doMock('@sentry/utils', () => ({
  addConsoleInstrumentationHandler,
  addFetchInstrumentationHandler,
  htmlTreeAsString,
  dateTimestampInSeconds,
  getComponentName,
  parseUrl,
  severityLevelFromString,
  safeJoin,
}))

import { initBreadcrumbIntegration } from '../src/browser-breadcrumb-integration'
import { Breadcrumb } from '@sentry/types'

describe('browser breadcrumb integration', () => {
  beforeEach(() => {
    addClickKeypressInstrumentationHandler.mockReset()
    addHistoryInstrumentationHandler.mockReset()
    addXhrInstrumentationHandler.mockReset()
    addConsoleInstrumentationHandler.mockReset()
    addFetchInstrumentationHandler.mockReset()
    htmlTreeAsString.mockReset()
    getComponentName.mockReset()
    dateTimestampInSeconds.mockReset()
    severityLevelFromString.mockReset()
    safeJoin.mockReset()

    htmlTreeAsString.mockReturnValue('html-tree-as-string-output')
    getComponentName.mockReturnValue('get-component-name-output')
    dateTimestampInSeconds.mockReturnValue('date-timestamp-in-seconds-output')

    severityLevelFromString.mockReturnValue('severityLevelFromString')

    safeJoin.mockImplementation((args: any[], delimiter: string) => args.join(delimiter))
  })

  it('should init', () => {
    const breadcrumbs: Breadcrumb[] = []
    initBreadcrumbIntegration({ breadcrumbs })
    expect(addClickKeypressInstrumentationHandler).toHaveBeenCalled()
    expect(addHistoryInstrumentationHandler).toHaveBeenCalled()
    expect(addXhrInstrumentationHandler).toHaveBeenCalled()
    expect(addConsoleInstrumentationHandler).toHaveBeenCalled()
    expect(addFetchInstrumentationHandler).toHaveBeenCalled()
  })

  describe('clickKeyPressHandler', () => {
    it('should add a breadcrumb', () => {
      const breadcrumbs: Breadcrumb[] = []
      initBreadcrumbIntegration({ breadcrumbs })
      expect(breadcrumbs).toHaveLength(0)
      htmlTreeAsString.mockReturnValue('html-tree-as-string-output')
      const _innerDomBreadcrumb = addClickKeypressInstrumentationHandler.mock.calls[0][0]
      _innerDomBreadcrumb({
        event: {
          target: {},
        },
        name: 'name',
        global: true,
      })
      expect(breadcrumbs).toHaveLength(1)
      expect(breadcrumbs[0]).toEqual({
        category: 'ui.name',
        message: 'html-tree-as-string-output',
        data: {
          'ui.component_name': 'get-component-name-output',
        },
        timestamp: 'date-timestamp-in-seconds-output',
      })
    })
  })

  describe('historyHandler', () => {
    it('should add a breadcrumb', () => {
      const breadcrumbs: Breadcrumb[] = []
      initBreadcrumbIntegration({ breadcrumbs })
      expect(breadcrumbs).toHaveLength(0)
      const _historyBreadcrumb = addHistoryInstrumentationHandler.mock.calls[0][0]
      const from = 'https://google.com/from'
      const to = 'https://google.com/to'
      _historyBreadcrumb({
        from,
        to,
      })
      expect(breadcrumbs).toHaveLength(1)
      expect(breadcrumbs[0]).toEqual({
        category: 'navigation',
        data: { from: '/path', to: '/path' },
        timestamp: 'date-timestamp-in-seconds-output',
      })
    })
  })

  describe('XhrHandler', () => {
    it('should add a breadcrumb', () => {
      const breadcrumbs: Breadcrumb[] = []
      initBreadcrumbIntegration({ breadcrumbs })
      expect(breadcrumbs).toHaveLength(0)
      const _xhrBreadcrumb = addXhrInstrumentationHandler.mock.calls[0][0]
      _xhrBreadcrumb({
        startTimestamp: 1,
        endTimestamp: 2,
        xhr: {
          [SENTRY_XHR_DATA_KEY]: {
            method: 'GET',
            url: 'https://example.org',
            status_code: 200,
            body: 'something',
          },
        },
      })
      expect(breadcrumbs).toHaveLength(1)
      expect(breadcrumbs[0]).toEqual({
        category: 'xhr',
        data: {
          method: 'GET',
          url: 'https://example.org',
          status_code: 200,
        },
        type: 'http',
        timestamp: 'date-timestamp-in-seconds-output',
      })
    })
  })

  describe('consoleInstrumentationHandler', () => {
    it('should add a breadcrumb', () => {
      const breadcrumbs: Breadcrumb[] = []
      initBreadcrumbIntegration({ breadcrumbs })
      expect(breadcrumbs).toHaveLength(0)
      const _consoleBreadcrumb = addConsoleInstrumentationHandler.mock.calls[0][0]
      _consoleBreadcrumb({
        level: 'log',
        args: ['a', 'b', { c: 1 }],
      })
      expect(breadcrumbs).toHaveLength(1)
      expect(breadcrumbs[0]).toEqual({
        category: 'console',
        data: {
          arguments: ['a', 'b', { c: 1 }],
          logger: 'console',
        },
        level: 'severityLevelFromString',
        message: 'a b [object Object]',
        timestamp: 'date-timestamp-in-seconds-output',
      })
    })
  })

  describe('fetchInstrumentationHandler', () => {
    it('should add a breadcrumb', () => {
      const breadcrumbs: Breadcrumb[] = []
      initBreadcrumbIntegration({ breadcrumbs })
      expect(breadcrumbs).toHaveLength(0)
      const _fetchBreadcrumb = addFetchInstrumentationHandler.mock.calls[0][0]
      _fetchBreadcrumb({
        startTimestamp: 1,
        endTimestamp: 2,
        fetchData: {
          method: 'GET',
          url: 'https://example.org',
          body: 'something',
        },
        response: {
          status: 200,
        },
      })
      expect(breadcrumbs).toHaveLength(1)
      expect(breadcrumbs[0]).toEqual({
        category: 'fetch',
        data: {
          method: 'GET',
          url: 'https://example.org',
          status_code: 200,
          body: 'something',
        },
        type: 'http',
        timestamp: 'date-timestamp-in-seconds-output',
      })
    })
  })
})
