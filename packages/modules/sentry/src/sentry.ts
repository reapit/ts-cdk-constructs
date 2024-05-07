import { createEventEnvelope, getEnvelopeEndpointWithUrlEncodedAuth } from '@sentry/core'
import { dsnFromString } from '@sentry/utils'

import { Event } from '@sentry/types'

import { serializeEnvelope } from './serialize-envelope'

export const sendEnvelope = async (sentryDsn: string, event: Event) => {
  const components = validateSentryDsn(sentryDsn)

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
  return components
}
