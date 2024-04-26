import { SeverityLevel } from '@sentry/types'
import {
  stackParserFromStackParserOptions,
  createStackParser,
  nodeStackLineParser,
  exceptionFromError,
} from '@sentry/utils'
import {
  RCQuery,
  RCHeaders,
  RCRequest,
  LogLevel,
  Transport,
  MinimalLogPayload,
  LogPayload,
} from '@reapit-cdk/edge-api-sdk'

import { createGetModuleFromFilename } from './module'
import { getCookies, sendEnvelope, validateSentryDsn } from './sentry'

const stackParser = stackParserFromStackParserOptions(
  createStackParser(nodeStackLineParser(createGetModuleFromFilename())),
)

const logLevelToSeverityLevel = (logLevel: LogLevel): SeverityLevel => {
  if (logLevel === 'panic' || logLevel === 'critical') {
    return 'fatal'
  }
  return logLevel
}

const pickFirst = (queryOrHeaders: RCQuery | RCHeaders) =>
  Object.entries(queryOrHeaders)
    .map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
    .reduce(
      (pv, cv) => ({
        ...pv,
        [cv[0]]: cv[1],
      }),
      {},
    )

const dateToSecs = (d: Date) => Math.round(d.getTime() / 1000)

export const initSentryLogger = (request: RCRequest<{ sentryDsn: string; sentryRelease: string }>): Transport => {
  const {
    host,
    cookies,
    env: { sentryDsn, sentryRelease },
    region,
    meta: { sessionId, functionName, functionVersion, invocationId },
  } = request

  validateSentryDsn(sentryDsn)

  return async (payload: MinimalLogPayload | LogPayload) => {
    const errorEntry = payload.entries.find((entry) => !!entry.error)
    const exception = errorEntry?.error ? exceptionFromError(stackParser, errorEntry.error) : undefined

    await sendEnvelope(sentryDsn, {
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
          (pv, cv) => ({
            ...pv,
            ...cv,
          }),
          {} as Record<string, string>,
        ),
        url: request.path,
      },
      release: sentryRelease,
      environment: host,
      breadcrumbs: payload.entries.map((entry) => ({
        level: logLevelToSeverityLevel(entry.level),
        message: entry.message,
        timestamp: dateToSecs(entry.timestamp),
      })),
    })
  }
}
