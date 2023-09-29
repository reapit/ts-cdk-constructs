import { CloudFrontRequestEvent, CloudFrontRequestResult, CloudFrontRequest, CloudFrontHeaders } from 'aws-lambda'
import { envKey } from './config'
import { parseQueryString } from './parse-querystring'
import { EventInput, HTTPMethod, RCHeaders, RCRequest, RCResponse } from './types'
import { getEnvRegion } from './utils'
import { parseCookies } from './parse-cookies'

export type RequestEvent = CloudFrontRequestEvent
export type ResponseEvent = CloudFrontRequestResult

const requestBodyHandler = (body: CloudFrontRequest['body']) => {
  if (body) {
    if (body.encoding === 'base64') {
      return Buffer.from(body.data, 'base64').toString('utf8')
    }
    return body.data
  }
}

const requestHeadersHandler = (headers: CloudFrontHeaders): RCHeaders => {
  const heads: RCHeaders = {}
  Object.entries(headers).forEach(([k, v]) => {
    if (k !== envKey) {
      heads[k] = v.map(({ value }) => value)
    }
  })
  return heads
}

const responseHeadersHandler = (headers: RCHeaders): CloudFrontHeaders => {
  const heads: CloudFrontHeaders = {}
  Object.entries(headers).forEach(([k, v]) => {
    if (Array.isArray(v)) {
      heads[k] = v.map((value) => ({ key: k, value }))
    } else {
      heads[k] = [{ key: k, value: v }]
    }
  })
  return heads
}

const getEnv = (req: CloudFrontRequest): Record<string, any> => {
  const header = req.origin?.s3?.customHeaders[envKey]
  const str = header ? header[0].value : undefined
  return str ? JSON.parse(str) : {}
}

export const toRCRequest = <EnvType>(event: RequestEvent): RCRequest<EnvType> => {
  const request = event.Records[0].cf.request
  const body = requestBodyHandler(request.body)
  const query = parseQueryString(request.querystring)

  const { region } = getEnvRegion()
  const headers = requestHeadersHandler(request.headers)
  const host = Array.isArray(headers['host']) ? headers['host'][0] : headers['host']
  let env = getEnv(request)

  if (env.domainMapping) {
    env = env.domainMapping[host]
  }

  const obj: RCRequest<EnvType> = {
    method: request.method as HTTPMethod,
    path: request.uri,
    headers,
    host,
    env: env as EnvType,
    region,
    cookies: headers.cookies ? parseCookies(headers.cookies) : [],
  }

  if (query && Object.keys(query).length) {
    obj['query'] = query
  }
  if (body) {
    obj['body'] = body
  }

  return obj
}

export const isRequestEvent = (event: EventInput): event is RequestEvent => {
  if ((event as CloudFrontRequestEvent).hasOwnProperty('Records')) {
    return true
  }
  return false
}

export const handleRCResponse = (res: RCResponse): ResponseEvent => {
  const obj: ResponseEvent = {
    headers: responseHeadersHandler(res.headers),
    status: res.status.toString(),
  }
  if (res.body) {
    obj['body'] = res.body
    obj['bodyEncoding'] = 'text'
  }
  return obj
}
