import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  CloudFrontRequestEvent,
  CloudFrontRequestResult,
} from 'aws-lambda'
import { Logger } from './logger'

export type EventInput = APIGatewayProxyEventV2 | CloudFrontRequestEvent
export type EventOutput = APIGatewayProxyResultV2 | CloudFrontRequestResult

export type RCHeaders = Record<string, string | string[]>

export type RCQuery = Record<string, string | string[]>

export type HTTPMethod = 'CONNECT' | 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT' | 'TRACE'

export type RCRequest<EnvType> = {
  path: string
  method: HTTPMethod
  body?: string
  headers: RCHeaders
  host: string
  cookies: string[]
  query?: RCQuery
  env: EnvType
  region: string
  meta: {
    sessionId: string
    functionName: string
    functionVersion: string
    invocationId: string
    event: EventInput
  }
}

export type JSONRequest<EnvType, BodyType> = Omit<RCRequest<EnvType>, 'body'> & {
  body?: BodyType
}

export type RCResponse = {
  headers: RCHeaders
  body?: string
  status: number
}

export type JSONResponse<T = any> = {
  headers?: RCHeaders
  body?: T
  status?: number
}

export type RedirectionResponse = {
  headers: {
    location: string
    'set-cookie'?: string[]
  }
  status: 302
}

export type RequestHandler<EnvType> = (
  request: RCRequest<EnvType> & { logger: Logger },
) => RCResponse | Promise<RCResponse>
export type JSONRequestHandler<EnvType, BodyType> = (
  request: JSONRequest<EnvType, BodyType> & { logger: Logger },
) => JSONResponse | Promise<JSONResponse>
