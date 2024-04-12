import { EventInput, JSONRequest, RCRequest } from './types'
import { format } from 'util'

export type LogLevel = 'info' | 'warning' | 'error' | 'critical' | 'panic'

export type LogEntry = {
  level: LogLevel
  message: string
  timestamp: Date
  error?: Error
}

export type MinimalLogPayload = {
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

export type Transport = (payload: MinimalLogPayload | LogPayload) => void | Promise<void>

export const consoleTransport = (payload: MinimalLogPayload | LogPayload) => {
  console.log(JSON.stringify(scrub(payload)))
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
  consoleTransport(payload)
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

export type LoggerConfig = {
  transports: Transport[]
  noConsole?: boolean
}

const isError = (arg: any): arg is Error => {
  return typeof arg === 'object' && typeof arg.name === 'string'
}

export class Logger {
  private request: RCRequest<any>
  private entries: LogEntry[] = []
  private transports: Transport[]
  private queue: (void | Promise<void>)[] = []

  private logFn(level: LogLevel) {
    return (...args: any[]) => {
      if (level === 'warning') {
        console.warn(...args)
      } else if (level === 'critical' || level === 'error' || level === 'panic') {
        console.error(...args)
      } else if (level === 'info') {
        console.info(...args)
      } else {
        console.log(...args)
      }
      this.entries.push({
        level,
        message: format(...args),
        timestamp: new Date(),
        error: args.find(isError),
      })
      const centralize = level === 'error' || level === 'critical' || level === 'panic'
      if (centralize) {
        this.writeOut(centralize)
      }
    }
  }

  private writeOut(centralize: boolean) {
    const {
      meta: { functionName, functionVersion, invocationId, sessionId, event },
      region,
    } = this.request

    const payload: LogPayload = {
      entries: this.entries,
      event,
      functionName,
      functionVersion,
      invocationId,
      sessionId,
      region,
      request: this.request,
      centralize,
      timestamp: new Date(),
    }

    this.queue.push(...this.transports.map((transport) => transport(payload)))
  }

  info(...args: any[]) {
    this.logFn('info')(...args)
  }

  warning(...args: any[]) {
    this.logFn('warning')(...args)
  }
  error(...args: any[]) {
    this.logFn('error')(...args)
  }
  critical(...args: any[]) {
    this.logFn('critical')(...args)
  }
  panic(...args: any[]) {
    this.logFn('panic')(...args)
  }

  async flush() {
    await Promise.all(this.queue)
  }

  constructor(request: RCRequest<any>, config?: LoggerConfig) {
    this.request = request
    this.transports = config?.transports || []
    if (!config?.noConsole) {
      this.transports.unshift(consoleTransport)
    }
  }
}
