import { createGetModuleFromFilename } from './module'

import { createEventEnvelope, getEnvelopeEndpointWithUrlEncodedAuth } from '@sentry/core'
import {
  stackParserFromStackParserOptions,
  createStackParser,
  nodeStackLineParser,
  exceptionFromError,
  dsnFromString,
  serializeEnvelope,
} from '@sentry/utils'

import { SeverityLevel } from '@sentry/types'

import { LogLevel, LogPayload, MinimalLogPayload, Transport } from '../logger'

const stackParser = stackParserFromStackParserOptions(
  createStackParser(nodeStackLineParser(createGetModuleFromFilename())),
)

export type InitProps = {
  dsn: string
  environment?: string
  release?: string
}

const logLevelToSeverityLevel = (logLevel: LogLevel): SeverityLevel => {
  if (logLevel === 'panic' || logLevel === 'critical') {
    return 'fatal'
  }
  return logLevel
}

export const init = (props: InitProps): Transport => {
  const components = dsnFromString(props.dsn)
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
      timestamp: errorEntry?.timestamp.getTime(),
      breadcrumbs: payload.entries.map((entry) => {
        return {
          level: logLevelToSeverityLevel(entry.level),
          message: entry.message,
          timestamp: entry.timestamp.getTime(),
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
