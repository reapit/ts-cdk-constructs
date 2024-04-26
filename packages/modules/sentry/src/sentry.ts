import { createEventEnvelope, getEnvelopeEndpointWithUrlEncodedAuth } from '@sentry/core'
import { dsnFromString } from '@sentry/utils'

import { Event } from '@sentry/types'

import { serializeEnvelope } from './serialize-envelope'

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

export const sendEnvelope = async (sentryDsn: string, event: Event) => {
  const components = dsnFromString(sentryDsn)
  if (!components) {
    throw new Error('invalid DSN provided')
  }

  const envelope = createEventEnvelope(event)
  const endpoint = getEnvelopeEndpointWithUrlEncodedAuth(components)
  await fetch(endpoint, {
    body: serializeEnvelope(envelope),
    method: 'post',
  })
}

export const validateSentryDsn = (sentryDsn: string) => {
  const components = dsnFromString(sentryDsn)
  if (!components) {
    throw new Error('invalid DSN provided')
  }
}
