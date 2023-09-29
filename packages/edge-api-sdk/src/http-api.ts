import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  APIGatewayProxyStructuredResultV2,
  APIGatewayProxyEventHeaders,
} from 'aws-lambda'
import { envKey } from './config'
import { parseQueryString } from './parse-querystring'
import { EventInput, HTTPMethod, RCHeaders, RCRequest, RCResponse } from './types'
import { getEnvRegion } from './utils'

export type RequestEvent = APIGatewayProxyEventV2
export type ResponseEvent = APIGatewayProxyResultV2

export const isRequestEvent = (event: EventInput): event is RequestEvent => {
  if ((event as RequestEvent).hasOwnProperty('isBase64Encoded')) {
    return true
  }
  return false
}

const requestHeadersHandler = (headers: APIGatewayProxyEventHeaders): RCHeaders => {
  const rcHeaders: RCHeaders = {}
  Object.entries(headers).forEach(([k, v]) => {
    if (v) {
      rcHeaders[k] = v
    }
  })
  return rcHeaders
}

const responseHeadersHandler = (rcHeaders: RCHeaders): APIGatewayProxyStructuredResultV2['headers'] => {
  const headers: Record<string, string> = {}
  Object.entries(rcHeaders).forEach(([k, v]) => {
    headers[k] = Array.isArray(v) ? v[0] : v
  })
  return headers
}

const requestBodyHandler = (event: RequestEvent) => {
  if (event.body && event.isBase64Encoded) {
    return Buffer.from(event.body, 'base64').toString('utf8')
  }
  return event.body
}

const getEnv = (headers: RCHeaders): Record<string, string> => {
  const envHeader = Array.isArray(headers[envKey]) ? headers[envKey][0] : headers[envKey]
  const env = envHeader ? JSON.parse(Buffer.from(envHeader, 'base64').toString('utf-8')) : {}
  if (env.domainMapping) {
    return Object.values(env.domainMapping)[0] as Record<string, string>
  }
  return env
}

export const toRCRequest = <EnvType>(request: RequestEvent): RCRequest<EnvType> => {
  const headers = requestHeadersHandler(request.headers)
  return {
    method: request.requestContext.http.method as HTTPMethod,
    path: request.rawPath,
    host: Array.isArray(headers['host']) ? headers['host'][0] : headers['host'],
    cookies: request.cookies || [],
    body: requestBodyHandler(request),
    headers,
    query: parseQueryString(request.rawQueryString),
    env: getEnv(headers) as EnvType,
    ...getEnvRegion(),
  }
}

export const handleRCResponse = (res: RCResponse): ResponseEvent => {
  return {
    headers: responseHeadersHandler(res.headers),
    isBase64Encoded: false,
    body: res.body,
    statusCode: res.status,
  }
}
