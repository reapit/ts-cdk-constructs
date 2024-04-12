import { createGetModuleFromFilename } from './module'

import { createEventEnvelope, getEnvelopeEndpointWithUrlEncodedAuth } from '@sentry/core'
import {
  stackParserFromStackParserOptions,
  createStackParser,
  nodeStackLineParser,
  exceptionFromError,
  dsnFromString,
} from '@sentry/utils'

import { SeverityLevel } from '@sentry/types'

import { LogLevel, LogPayload, MinimalLogPayload, Transport } from '../logger'
import { RCHeaders, RCQuery, RCRequest } from '../types'
import { serializeEnvelope } from './serialize-envelope'

const stackParser = stackParserFromStackParserOptions(
  createStackParser(nodeStackLineParser(createGetModuleFromFilename())),
)

const logLevelToSeverityLevel = (logLevel: LogLevel): SeverityLevel => {
  if (logLevel === 'panic' || logLevel === 'critical') {
    return 'fatal'
  }
  return logLevel
}

export const getCookies = (cookie: string): Record<string, string> =>
  Object.fromEntries(
    cookie
      .split('; ')
      .map((v) => {
        try {
          return v.split(/=(.*)/s).map(decodeURIComponent)
        } catch {
          return ['', '']
        }
      })
      .filter(([v]) => !!v),
  )

const pickFirst = (queryOrHeaders: RCQuery | RCHeaders) => {
  return Object.entries(queryOrHeaders)
    .map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
    .reduce((pv, cv) => {
      return {
        ...pv,
        [cv[0]]: cv[1],
      }
    }, {})
}

const dateToSecs = (d: Date) => Math.round(d.getTime() / 1000)

export const init = (request: RCRequest<{ sentryDsn: string; sentryRelease: string }>): Transport => {
  const {
    host,
    cookies,
    env: { sentryDsn, sentryRelease },
    region,
    meta: { sessionId, functionName, functionVersion, invocationId },
  } = request
  const components = dsnFromString(sentryDsn)
  if (!components) {
    throw new Error('invalid DSN provided')
  }

  return async (payload: MinimalLogPayload | LogPayload) => {
    const errorEntry = payload.entries.find((entry) => !!entry.error)
    const exception = errorEntry?.error ? exceptionFromError(stackParser, errorEntry.error) : undefined
    const envelope = createEventEnvelope({
      exception: exception
        ? {
            values: [exception],
          }
        : undefined,
      timestamp: errorEntry ? dateToSecs(errorEntry?.timestamp) : undefined,
      tags: {
        sessionId,
        functionName,
      },
      contexts: {
        invocation: {
          functionName,
          functionVersion,
          invocationId,
          region,
        },
      },
      request: {
        headers: pickFirst(request.headers),
        method: request.method,
        query_string: request.query ? pickFirst(request.query) : undefined,
        cookies: cookies.map(getCookies).reduce(
          (pv, cv) => {
            return {
              ...pv,
              ...cv,
            }
          },
          {} as Record<string, string>,
        ),
        url: request.path,
      },
      release: sentryRelease,
      environment: host,
      breadcrumbs: payload.entries.map((entry) => {
        return {
          level: logLevelToSeverityLevel(entry.level),
          message: entry.message,
          timestamp: dateToSecs(entry.timestamp),
        }
      }),
    })

    const endpoint = getEnvelopeEndpointWithUrlEncodedAuth(components)
    await fetch(endpoint, {
      body: serializeEnvelope(envelope),
      method: 'post',
    })
  }
}
