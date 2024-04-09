import { createGetModuleFromFilename } from './module'

import { createEventEnvelope, getEnvelopeEndpointWithUrlEncodedAuth } from '@sentry/core'
import {
  stackParserFromStackParserOptions,
  createStackParser,
  nodeStackLineParser,
  exceptionFromError,
  dsnFromString,
} from '@sentry/utils'

import { Envelope, SeverityLevel } from '@sentry/types'

import { LogLevel, LogPayload, MinimalLogPayload, Transport } from '../logger'

const encodeUTF8 = (input: string) => new TextEncoder().encode(input)

export function serializeEnvelope(envelope: Envelope): string | Uint8Array {
  const [envHeaders, items] = envelope

  // Initially we construct our envelope as a string and only convert to binary chunks if we encounter binary data
  let parts: string | Uint8Array[] = JSON.stringify(envHeaders)

  function append(next: string | Uint8Array): void {
    if (typeof parts === 'string') {
      parts = typeof next === 'string' ? parts + next : [encodeUTF8(parts), next]
    } else {
      parts.push(typeof next === 'string' ? encodeUTF8(next) : next)
    }
  }

  for (const item of items) {
    const [itemHeaders, payload] = item

    append(`\n${JSON.stringify(itemHeaders)}\n`)

    if (typeof payload === 'string' || payload instanceof Uint8Array) {
      append(payload)
    } else {
      append(JSON.stringify(payload))
    }
  }

  return typeof parts === 'string' ? parts : concatBuffers(parts)
}

function concatBuffers(buffers: Uint8Array[]): Uint8Array {
  const totalLength = buffers.reduce((acc, buf) => acc + buf.length, 0)

  const merged = new Uint8Array(totalLength)
  let offset = 0
  for (const buffer of buffers) {
    merged.set(buffer, offset)
    offset += buffer.length
  }

  return merged
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
