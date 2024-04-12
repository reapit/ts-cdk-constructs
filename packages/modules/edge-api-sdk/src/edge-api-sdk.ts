import { Context } from 'aws-lambda'
import * as cloudfront from './cloudfront'
import * as httpApi from './http-api'

import { EventInput, JSONRequestHandler, RCHeaders, RCRequest, RCResponse, RequestHandler } from './types'
import { Logger, LoggerConfig, panic } from './logger'
import { sessionIdHeaderName } from './config'

const eventToRequest = <EnvType>(event: EventInput, context: Context): RCRequest<EnvType> => {
  if (cloudfront.isRequestEvent(event)) {
    return cloudfront.toRCRequest<EnvType>(event, context)
  }
  if (httpApi.isRequestEvent(event)) {
    return httpApi.toRCRequest<EnvType>(event, context)
  }

  throw new Error('Unable to handle event')
}

const allowHeaders = [
  'Accept',
  'Accept-Language',
  'Api-Version',
  'Authorization',
  'Content-Type',
  'Referer',
  'User-Agent',
  sessionIdHeaderName,
]
const allowMethods = ['POST', 'PUT', 'PATCH', 'GET', 'OPTIONS', 'DELETE']

const respondToEvent = (event: EventInput, response: RCResponse) => {
  // TODO: figure out a better way of just getting the cors origin here
  const req = eventToRequest<{ corsOrigin?: string }>(event, {} as Context)
  const corsHeaders = req.env.corsOrigin
    ? {
        'Access-Control-Allow-Headers': allowHeaders.join(', '),
        'Access-Control-Allow-Methods': allowMethods.join(', '),
        'Access-Control-Allow-Origin': req.env.corsOrigin,
        'Access-Control-Expose-Headers': '*',
        'Access-Control-Allow-Credentials': 'true',
      }
    : {}
  const headers = {
    ...corsHeaders,
    ...response.headers,
  } as RCHeaders
  const responseWithCorsHeaders = {
    ...response,
    headers,
  }
  if (cloudfront.isRequestEvent(event)) {
    return cloudfront.handleRCResponse(responseWithCorsHeaders)
  }
  if (httpApi.isRequestEvent(event)) {
    return httpApi.handleRCResponse(responseWithCorsHeaders)
  }
}

export type HandlerConfig = {
  loggerConfig: LoggerConfig
}

export type HandlerConfigResolver<EnvType> = (request: RCRequest<EnvType>) => HandlerConfig

const resolveHandlerConfig = <EnvType>(
  configOrResolver: HandlerConfig | HandlerConfigResolver<EnvType> | undefined,
  request: RCRequest<EnvType>,
): HandlerConfig | undefined => {
  if (typeof configOrResolver === 'function') {
    return configOrResolver(request)
  } else {
    return configOrResolver
  }
}

export const requestHandler = <EnvType>(
  requestHandler: RequestHandler<EnvType>,
  handlerConfigOrResolver?: HandlerConfig | HandlerConfigResolver<EnvType>,
) => {
  const fn = async (event: EventInput, context: Context) => {
    try {
      const request = eventToRequest<EnvType>(event, context)
      const handlerConfig = resolveHandlerConfig(handlerConfigOrResolver, request)
      const logger = new Logger(request, handlerConfig?.loggerConfig)
      if (request.method === 'OPTIONS') {
        await logger.flush()
        return respondToEvent(event, {
          status: 200,
          headers: {},
        })
      }
      try {
        const response = await requestHandler({ ...request, logger })
        await logger.flush()
        return respondToEvent(event, response)
      } catch (e) {
        logger.error(e)
        await logger.flush()
        return errorResponseToEvent(event, e as Error)
      }
    } catch (e) {
      panic(e as Error, event)
      throw new Error('unhandled error')
    }
  }
  fn.handler = requestHandler
  return fn
}

const errorResponseToEvent = (event: EventInput, err: Error) => {
  return respondToEvent(event, {
    status: 500,
    headers: {
      'content-type': ['application/json'],
    },
    body: JSON.stringify({
      status: 'error',
      error: {
        name: err.name,
        message: err.message,
        stack: httpApi.isRequestEvent(event) ? err.stack : undefined,
      },
    }),
  })
}

export const jsonRequestHandler = <EnvType, BodyType = any>(
  jsonRequestHandler: JSONRequestHandler<EnvType, BodyType>,
  handlerConfigOrResolver?: HandlerConfig | HandlerConfigResolver<EnvType>,
) => {
  const fn = async (event: EventInput, context: Context) => {
    try {
      const request = eventToRequest<EnvType>(event, context)
      const handlerConfig = resolveHandlerConfig(handlerConfigOrResolver, request)
      const logger = new Logger(request, handlerConfig?.loggerConfig)
      const body = request.body ? JSON.parse(request.body) : undefined
      if (request.method === 'OPTIONS') {
        await logger.flush()
        return respondToEvent(event, {
          status: 200,
          headers: {},
        })
      }

      try {
        const response = await jsonRequestHandler({
          ...request,
          body: body as BodyType | undefined,
          logger,
        })
        await logger.flush()

        if (response.status === 302) {
          return respondToEvent(event, {
            status: response.status,
            headers: {
              ...(response.headers ?? {}),
            },
          })
        }

        return respondToEvent(event, {
          status: response.status ?? 200,
          headers: {
            ...(response.headers ?? {}),
            'content-type': ['application/json'],
          },
          body: response.body ? JSON.stringify(response.body) : undefined,
        })
      } catch (e) {
        logger.error(e)
        await logger.flush()
        return errorResponseToEvent(event, e as Error)
      }
    } catch (e) {
      panic(e as Error, event)
      throw new Error('unhandled error')
    }
  }

  fn.handler = jsonRequestHandler

  return fn
}

export const formRequestHandler = <EnvType, BodyType = any>(
  formRequestHandler: JSONRequestHandler<EnvType, BodyType>,
  handlerConfigOrResolver?: HandlerConfig | HandlerConfigResolver<EnvType>,
) => {
  const fn = async (event: EventInput, context: Context) => {
    try {
      const request = eventToRequest<EnvType>(event, context)
      const handlerConfig = resolveHandlerConfig(handlerConfigOrResolver, request)
      const logger = new Logger(request, handlerConfig?.loggerConfig)
      const body = request.body ? Object.fromEntries(new URLSearchParams(request.body)) : undefined
      if (request.method === 'OPTIONS') {
        await logger.flush()
        return respondToEvent(event, {
          status: 200,
          headers: {},
        })
      }

      try {
        const response = await formRequestHandler({
          ...request,
          body: body as BodyType | undefined,
          logger,
        })
        await logger.flush()

        if (response.status === 302) {
          return respondToEvent(event, {
            status: response.status,
            headers: {
              ...(response.headers ?? {}),
            },
          })
        }

        return respondToEvent(event, {
          status: response.status ?? 200,
          headers: {
            ...(response.headers ?? {}),
            'content-type': ['application/json'],
          },
          body: response.body ? JSON.stringify(response.body) : undefined,
        })
      } catch (e) {
        logger.error(e)
        await logger.flush()
        return errorResponseToEvent(event, e as Error)
      }
    } catch (e) {
      panic(e as Error, event)
      throw new Error('unhandled error')
    }
  }

  fn.handler = formRequestHandler

  return fn
}
