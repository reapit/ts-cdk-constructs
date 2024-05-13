import { sendEnvelope, validateSentryDsn } from './sentry'
import { exceptionFromError, dateTimestampInSeconds } from '@sentry/utils'
import { browserStackParser } from './browser-stack-parser'
import { Breadcrumb } from '@sentry/types'

export type Integration = ({ breadcrumbs }: { breadcrumbs: Breadcrumb[] }) => void

export type BrowserSentryConfig = {
  dsn: string
  environment: string
  release: string
  componentName: string
  sessionId: string
  integrations?: Integration[]
}

export const initBrowserSentry = ({
  componentName,
  dsn,
  environment,
  release,
  sessionId,
  integrations,
}: BrowserSentryConfig) => {
  validateSentryDsn(dsn)

  const breadcrumbs: Breadcrumb[] = []

  integrations?.forEach((integration) => {
    integration({
      breadcrumbs,
    })
  })

  const sendError = async (error: Error) => {
    const exception = exceptionFromError(browserStackParser, error)
    const timestamp = dateTimestampInSeconds()
    breadcrumbs.push({ type: 'error', category: 'error', level: 'error', message: error.message, timestamp })
    await sendEnvelope(dsn, {
      exception: {
        values: [exception],
      },
      breadcrumbs,
      timestamp,
      tags: {
        sessionId,
        componentName,
      },
      release,
      environment,
    })
  }

  return {
    sendError,
  }
}
