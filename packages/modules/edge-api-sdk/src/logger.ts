import { EventInput, JSONRequest, RCRequest } from './types'
import { format } from 'util'

type LogFn = (message?: any, ...optionalParams: any[]) => void

type LogLevel = 'info' | 'warning' | 'error' | 'critical' | 'panic'

export type Logger = Record<LogLevel, LogFn>

type LogEntry = {
  level: LogLevel
  message: string
  timestamp: Date
  error?: Error
}

type MinimalLogPayload = {
  event: EventInput
  functionName: string
  functionVersion: string
  region: string
  timestamp: Date
  centralize: boolean
  entries: LogEntry[]
}

export type LogPayload = MinimalLogPayload & {
  request: RCRequest<any> | JSONRequest<any, any>
  sessionId?: string
  invocationId: string
}

const isNotMinimal = (payload: MinimalLogPayload | LogPayload): payload is LogPayload => {
  return !!(payload as LogPayload).request
}

const isJsonRequest = (request: RCRequest<any> | JSONRequest<any, any>): request is JSONRequest<any, any> => {
  return typeof request.body === 'object'
}

const scrubEvent = (event: any): EventInput => {
  if (event.body) {
    delete event.body
  }
  if (event.Records?.[0]?.cf?.request?.body) {
    delete event.Records[0].cf.request.body
  }
  return event
}

const scrub = <T extends MinimalLogPayload | LogPayload>(payload: T): T => {
  let doScrubEvent = true

  if (isNotMinimal(payload)) {
    if (payload.request.body && isJsonRequest(payload.request)) {
      const body = payload.request.body
      if (body.password) {
        payload.request.body = {
          ...body,
          password: 'request-body-entry-removed',
        }
      } else {
        doScrubEvent = false
      }
    } else {
      doScrubEvent = false
    }
  }

  return {
    ...payload,
    event: doScrubEvent ? scrubEvent(payload.event) : payload.event,
  }
}

const writeOut = (payload: MinimalLogPayload | LogPayload) => {
  console.log(JSON.stringify(scrub(payload)))
}

const flush = (request: RCRequest<any>, entries: LogEntry[], centralize: boolean) => {
  const {
    meta: { functionName, functionVersion, invocationId, sessionId, event },
    region,
  } = request

  const payload: LogPayload = {
    entries,
    event,
    functionName,
    functionVersion,
    invocationId,
    sessionId,
    region,
    request,
    centralize,
    timestamp: new Date(),
  }

  writeOut(payload)
}

type AdditionalLogData = {
  error: Error
}

const isAdditionalLogData = (thing: any): thing is AdditionalLogData => {
  if (typeof thing === 'object' && thing.error && typeof thing.error === 'object' && thing.error.name) {
    return true
  }
  return false
}

export const panic = (error: Error, event: EventInput) => {
  const { AWS_REGION, AWS_LAMBDA_FUNCTION_NAME, AWS_LAMBDA_FUNCTION_VERSION } = process.env
  const payload: MinimalLogPayload = {
    centralize: true,
    event,
    functionName: AWS_LAMBDA_FUNCTION_NAME || '',
    functionVersion: AWS_LAMBDA_FUNCTION_VERSION || '',
    region: AWS_REGION || '',
    timestamp: new Date(),
    entries: [
      {
        level: 'panic',
        message: format({ error }),
        timestamp: new Date(),
        error: stringifiableError(error),
      },
    ],
  }
  writeOut(payload)
}

const stringifiableError = (error?: Error): Error | undefined => {
  if (!error) {
    return error
  }
  return {
    message: error.message,
    name: error.name,
    stack: error.stack,
  }
}

export const createLogger = (request: RCRequest<any>): Logger => {
  const entries: LogEntry[] = []

  const logFn =
    (level: LogLevel): LogFn =>
    (...args) => {
      if (level === 'warning') {
        console.warn(...args)
      } else if (level === 'critical' || level === 'error' || level === 'panic') {
        console.error(...args)
      } else if (level === 'info') {
        console.info(...args)
      } else {
        console.log(...args)
      }
      entries.push({
        level,
        message: format(...args),
        timestamp: new Date(),
        error: stringifiableError(args.find(isAdditionalLogData)?.error),
      })
      const centralize = level === 'error' || level === 'critical'
      if (centralize) {
        flush(request, entries, centralize)
      }
    }

  return {
    info: logFn('info'),
    warning: logFn('warning'),
    error: logFn('error'),
    critical: logFn('critical'),
    panic: logFn('panic'),
  }
}
