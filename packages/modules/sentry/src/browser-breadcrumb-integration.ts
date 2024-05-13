/**
 * 
 * MIT License

Copyright (c) 2024 Functional Software, Inc. dba Sentry

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */

import {
  SENTRY_XHR_DATA_KEY,
  addClickKeypressInstrumentationHandler,
  addHistoryInstrumentationHandler,
  addXhrInstrumentationHandler,
} from '@sentry-internal/browser-utils'

import type {
  Breadcrumb,
  FetchBreadcrumbData,
  FetchBreadcrumbHint,
  HandlerDataConsole,
  HandlerDataDom,
  HandlerDataFetch,
  HandlerDataHistory,
  HandlerDataXhr,
  XhrBreadcrumbData,
  XhrBreadcrumbHint,
  BreadcrumbHint,
} from '@sentry/types'
import {
  addConsoleInstrumentationHandler,
  addFetchInstrumentationHandler,
  dateTimestampInSeconds,
  getComponentName,
  htmlTreeAsString,
  parseUrl,
  safeJoin,
  severityLevelFromString,
} from '@sentry/utils'
import { Integration } from './browser'

const WINDOW = window

type AddBreadcrumbFn = (breadcrumb: Breadcrumb, hint?: BreadcrumbHint) => void

export const initBreadcrumbIntegration: Integration = ({ breadcrumbs }) => {
  _initBreadcrumbIntegration((breadcrumb: Breadcrumb) => {
    breadcrumbs.push({
      ...breadcrumb,
      timestamp: dateTimestampInSeconds(),
    })
  })
}

const _initBreadcrumbIntegration = (addBreadcrumbFn: AddBreadcrumbFn) => {
  addConsoleInstrumentationHandler(_getConsoleBreadcrumbHandler(addBreadcrumbFn))
  addClickKeypressInstrumentationHandler(_getDomBreadcrumbHandler(addBreadcrumbFn))
  addXhrInstrumentationHandler(_getXhrBreadcrumbHandler(addBreadcrumbFn))
  addFetchInstrumentationHandler(_getFetchBreadcrumbHandler(addBreadcrumbFn))
  addHistoryInstrumentationHandler(_getHistoryBreadcrumbHandler(addBreadcrumbFn))
}

/**
 * A HOC that creaes a function that creates breadcrumbs from DOM API calls.
 * This is a HOC so that we get access to dom options in the closure.
 */
function _getDomBreadcrumbHandler(addBreadcrumbFn: AddBreadcrumbFn): (handlerData: HandlerDataDom) => void {
  return function _innerDomBreadcrumb(handlerData: HandlerDataDom): void {
    let target
    let componentName
    const keyAttrs = undefined

    const maxStringLength = undefined

    // Accessing event.target can throw (see getsentry/raven-js#838, #768)
    try {
      const event = handlerData.event as Event | Node
      const element = _isEvent(event) ? event.target : event
      target = htmlTreeAsString(element, { keyAttrs, maxStringLength })
      componentName = getComponentName(element)
    } catch (e) {
      target = '<unknown>'
    }

    if (target.length === 0) {
      return
    }

    const breadcrumb: Breadcrumb = {
      category: `ui.${handlerData.name}`,
      message: target,
    }

    if (componentName) {
      breadcrumb.data = { 'ui.component_name': componentName }
    }

    addBreadcrumbFn(breadcrumb, {
      event: handlerData.event,
      name: handlerData.name,
      global: handlerData.global,
    })
  }
}

/**
 * Creates breadcrumbs from console API calls
 */
function _getConsoleBreadcrumbHandler(addBreadcrumbFn: AddBreadcrumbFn): (handlerData: HandlerDataConsole) => void {
  return function _consoleBreadcrumb(handlerData: HandlerDataConsole): void {
    const breadcrumb = {
      category: 'console',
      data: {
        arguments: handlerData.args,
        logger: 'console',
      },
      level: severityLevelFromString(handlerData.level),
      message: safeJoin(handlerData.args, ' '),
    }

    if (handlerData.level === 'assert') {
      if (handlerData.args[0] === false) {
        breadcrumb.message = `Assertion failed: ${safeJoin(handlerData.args.slice(1), ' ') || 'console.assert'}`
        breadcrumb.data.arguments = handlerData.args.slice(1)
      } else {
        // Don't capture a breadcrumb for passed assertions
        return
      }
    }

    addBreadcrumbFn(breadcrumb, {
      input: handlerData.args,
      level: handlerData.level,
    })
  }
}

/**
 * Creates breadcrumbs from XHR API calls
 */
function _getXhrBreadcrumbHandler(addBreadcrumbFn: AddBreadcrumbFn): (handlerData: HandlerDataXhr) => void {
  return function _xhrBreadcrumb(handlerData: HandlerDataXhr): void {
    const { startTimestamp, endTimestamp } = handlerData

    const sentryXhrData = handlerData.xhr[SENTRY_XHR_DATA_KEY]

    // We only capture complete, non-sentry requests
    if (!startTimestamp || !endTimestamp || !sentryXhrData) {
      return
    }

    const { method, url, status_code, body } = sentryXhrData

    const data: XhrBreadcrumbData = {
      method,
      url,
      status_code,
    }

    const hint: XhrBreadcrumbHint = {
      xhr: handlerData.xhr,
      input: body,
      startTimestamp,
      endTimestamp,
    }

    addBreadcrumbFn(
      {
        category: 'xhr',
        data,
        type: 'http',
      },
      hint,
    )
  }
}

/**
 * Creates breadcrumbs from fetch API calls
 */
function _getFetchBreadcrumbHandler(addBreadcrumbFn: AddBreadcrumbFn): (handlerData: HandlerDataFetch) => void {
  return function _fetchBreadcrumb(handlerData: HandlerDataFetch): void {
    const { startTimestamp, endTimestamp } = handlerData

    // We only capture complete fetch requests
    if (!endTimestamp) {
      return
    }

    if (/sentry_key/.exec(handlerData.fetchData.url) && handlerData.fetchData.method === 'POST') {
      // We will not create breadcrumbs for fetch requests that contain `sentry_key` (internal sentry requests)
      return
    }

    if (handlerData.error) {
      const data: FetchBreadcrumbData = handlerData.fetchData
      const hint: FetchBreadcrumbHint = {
        data: handlerData.error,
        input: handlerData.args,
        startTimestamp,
        endTimestamp,
      }

      addBreadcrumbFn(
        {
          category: 'fetch',
          data,
          level: 'error',
          type: 'http',
        },
        hint,
      )
    } else {
      const response = handlerData.response as Response | undefined
      const data: FetchBreadcrumbData = {
        ...handlerData.fetchData,
        status_code: response?.status,
      }
      const hint: FetchBreadcrumbHint = {
        input: handlerData.args,
        response,
        startTimestamp,
        endTimestamp,
      }
      addBreadcrumbFn(
        {
          category: 'fetch',
          data,
          type: 'http',
        },
        hint,
      )
    }
  }
}

/**
 * Creates breadcrumbs from history API calls
 */
function _getHistoryBreadcrumbHandler(addBreadcrumbFn: AddBreadcrumbFn): (handlerData: HandlerDataHistory) => void {
  return function _historyBreadcrumb(handlerData: HandlerDataHistory): void {
    let from: string | undefined = handlerData.from
    let to: string | undefined = handlerData.to
    const parsedLoc = parseUrl(WINDOW.location.href)
    let parsedFrom = from ? parseUrl(from) : undefined
    const parsedTo = parseUrl(to)

    // Initial pushState doesn't provide `from` information
    if (!parsedFrom?.path) {
      parsedFrom = parsedLoc
    }

    // Use only the path component of the URL if the URL matches the current
    // document (almost all the time when using pushState)
    if (parsedLoc.protocol === parsedTo.protocol && parsedLoc.host === parsedTo.host) {
      to = parsedTo.relative
    }
    if (parsedLoc.protocol === parsedFrom.protocol && parsedLoc.host === parsedFrom.host) {
      from = parsedFrom.relative
    }

    addBreadcrumbFn({
      category: 'navigation',
      data: {
        from,
        to,
      },
    })
  }
}

function _isEvent(event: unknown): event is Event {
  return !!event && !!(event as Record<string, unknown>).target
}
