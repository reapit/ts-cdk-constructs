import { NodeClient, createTransport, createGetModuleFromFilename } from '@sentry/node'
import { NodeTransportOptions } from '@sentry/node/types/transports'
import { Transport as SentryTransport, SeverityLevel } from '@sentry/types'
import { stackParserFromStackParserOptions, createStackParser, nodeStackLineParser } from '@sentry/utils'
import { LogLevel, LogPayload, MinimalLogPayload, Transport } from './logger'

const sentryTransport: (transportOptions: NodeTransportOptions) => SentryTransport = (options) => {
  return createTransport(options, async (request) => {
    const response = await fetch(options.url, {
      body: request.body,
      method: 'POST',
      referrerPolicy: 'origin',
      headers: options.headers,
    })
    return {
      statusCode: response.status,
      headers: {
        'x-sentry-rate-limits': response.headers.get('X-Sentry-Rate-Limits'),
        'retry-after': response.headers.get('Retry-After'),
      },
    }
  })
}

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
  const client = new NodeClient({
    integrations: [],
    transport: sentryTransport,
    stackParser,
    ...props,
  })

  return async (payload: MinimalLogPayload | LogPayload) => {
    payload.entries.forEach((entry) => {
      client.captureMessage(entry.message, logLevelToSeverityLevel(entry.level))
      if (entry.error) {
        client.captureException(entry.error)
      }
    })
    await client.flush()
  }
}
