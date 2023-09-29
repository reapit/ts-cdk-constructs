import * as cloudfront from './cloudfront'
import * as httpApi from './http-api'

import { EventInput, JSONRequestHandler, RCHeaders, RCRequest, RCResponse, RequestHandler } from './types'

const eventToRequest = <EnvType>(event: EventInput): RCRequest<EnvType> => {
  console.log(JSON.stringify(event))
  if (cloudfront.isRequestEvent(event)) {
    return cloudfront.toRCRequest<EnvType>(event)
  }
  if (httpApi.isRequestEvent(event)) {
    return httpApi.toRCRequest<EnvType>(event)
  }

  throw new Error('Unable to handle event')
}

const respondToEvent = (event: EventInput, response: RCResponse) => {
  const req = eventToRequest<{ corsOrigin?: string }>(event)
  const corsHeaders = req.env.corsOrigin
    ? {
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': '*',
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

export const requestHandler = <EnvType>(requestHandler: RequestHandler<EnvType>) => {
  const fn = async (event: EventInput) => {
    const request = eventToRequest<EnvType>(event)
    if (request.method === 'OPTIONS') {
      return respondToEvent(event, {
        status: 200,
        headers: {},
      })
    }
    try {
      const response = await requestHandler(request)
      return respondToEvent(event, response)
    } catch (e) {
      return errorResponseToEvent(event, e as Error)
    }
  }
  fn.handler = requestHandler
  return fn
}

const errorResponseToEvent = (event: EventInput, err: Error) => {
  console.error(err)
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
) => {
  const fn = async (event: EventInput) => {
    const request = eventToRequest<EnvType>(event)
    const body = request.body ? JSON.parse(request.body) : undefined
    if (request.method === 'OPTIONS') {
      return respondToEvent(event, {
        status: 200,
        headers: {},
      })
    }

    try {
      const response = await jsonRequestHandler({
        ...request,
        body: body as BodyType | undefined,
      })

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
      return errorResponseToEvent(event, e as Error)
    }
  }

  fn.handler = jsonRequestHandler

  return fn
}

export const formRequestHandler = <EnvType, BodyType = any>(
  formRequestHandler: JSONRequestHandler<EnvType, BodyType>,
) => {
  const fn = async (event: EventInput) => {
    const request = eventToRequest<EnvType>(event)
    const body = request.body ? Object.fromEntries(new URLSearchParams(request.body)) : undefined
    if (request.method === 'OPTIONS') {
      return respondToEvent(event, {
        status: 200,
        headers: {},
      })
    }

    try {
      const response = await formRequestHandler({
        ...request,
        body: body as BodyType | undefined,
      })

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
      return errorResponseToEvent(event, e as Error)
    }
  }

  fn.handler = formRequestHandler

  return fn
}
