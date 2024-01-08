import { EventInput, RCRequest } from './types'
import { format } from 'util'

type LogFn = (message?: any, ...optionalParams: any[]) => void

type LogLevel = 'info' | 'warning' | 'error' | 'critical'

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

type LogPayload = MinimalLogPayload & {
  request: RCRequest<any>
  sessionId: string
  invocationId: string
}

const writeOut = (payload: MinimalLogPayload | LogPayload) => {
  console.log(JSON.stringify(payload))
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
        level: 'critical',
        message: error.message,
        timestamp: new Date(),
        error,
      },
    ],
  }
  writeOut(payload)
}

export const createLogger = (request: RCRequest<any>): Logger => {
  const entries: LogEntry[] = []

  const logFn =
    (level: LogLevel): LogFn =>
    (...args) => {
      if (level === 'warning') {
        console.warn(...args)
      }
      if (level === 'critical' || level === 'error') {
        console.error(...args)
      }
      if (level === 'info') {
        console.info(...args)
      }
      entries.push({
        level,
        message: format(...args),
        timestamp: new Date(),
        error: args.find(isAdditionalLogData)?.error,
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
  }
}
