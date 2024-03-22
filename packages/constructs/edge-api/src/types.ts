import { Bucket } from 'aws-cdk-lib/aws-s3'
import { EdgeAPILambda } from './edge-api-lambda'
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager'
import { CloudFrontRequest, CloudFrontResponse, CloudFrontResultResponse } from 'aws-lambda'
import { ResponseHeadersPolicyProps } from 'aws-cdk-lib/aws-cloudfront'

export enum HttpMethod {
  /** HTTP ANY */
  ANY = 'ANY',
  /** HTTP DELETE */
  DELETE = 'DELETE',
  /** HTTP GET */
  GET = 'GET',
  /** HTTP HEAD */
  HEAD = 'HEAD',
  /** HTTP OPTIONS */
  OPTIONS = 'OPTIONS',
  /** HTTP PATCH */
  PATCH = 'PATCH',
  /** HTTP POST */
  POST = 'POST',
  /** HTTP PUT */
  PUT = 'PUT',
}

export type ResponseHeaderOverrides = ResponseHeadersPolicyProps

interface BaseEndpointProps {
  readonly pathPattern: string
  readonly responseHeaderOverrides?: ResponseHeaderOverrides
}

export interface LambdaEndpointProps extends BaseEndpointProps {
  readonly lambdaFunction: EdgeAPILambda
  readonly isStatic?: boolean
  readonly methods?: HttpMethod[]
}

export interface FrontendEndpointProps extends BaseEndpointProps {
  readonly bucket: Bucket
  readonly invalidationItems?: string[]
}

export type RequestMiddlewareFn = (
  req: CloudFrontRequest,
  mapping: Destination,
) => void | Promise<void> | CloudFrontResultResponse | Promise<CloudFrontResultResponse>

export type ResponseMiddlewareFn = (
  req: CloudFrontRequest,
  res: CloudFrontResponse,
  mapping: Destination,
) => void | Promise<void>

export class RequestMiddleware {
  fn: string

  constructor(fn: string) {
    this.fn = fn.toString()
  }

  toString() {
    return this.fn
  }
}

export class ResponseMiddleware {
  fn: string

  constructor(fn: string) {
    this.fn = fn.toString()
  }

  toString() {
    return this.fn
  }
}

export const isResponseMiddleware = (
  middleware: RequestMiddleware | ResponseMiddleware,
): middleware is ResponseMiddleware => {
  return middleware instanceof ResponseMiddleware
}

export const isRequestMiddleware = (
  middleware: RequestMiddleware | ResponseMiddleware,
): middleware is RequestMiddleware => {
  return middleware instanceof RequestMiddleware
}

export type Destination = string | Record<string, string | { destination: string; [k: string]: string }>

export interface DisableBuiltInMiddlewares {
  readonly cookie?: boolean
  readonly redirect?: boolean
}

export interface ProxyEndpointProps extends BaseEndpointProps {
  readonly destination: Destination

  readonly customMiddlewares?: (RequestMiddleware | ResponseMiddleware)[]
  readonly disableBuiltInMiddlewares?: DisableBuiltInMiddlewares
  readonly originResponseInterceptor?: EdgeAPILambda
  readonly methods?: HttpMethod[]
  readonly insecure?: boolean
}

export interface RedirectionEndpointProps extends BaseEndpointProps {
  readonly destination: Destination
  readonly redirect: true
}

class BaseEndpoint {
  pathPattern: string

  constructor({ pathPattern }: BaseEndpointProps) {
    this.pathPattern = pathPattern
  }
}

export interface IFrontendEndpoint {
  pathPattern: string
  bucket: Bucket
  invalidationItems?: string[]
  responseHeaderOverrides?: ResponseHeadersPolicyProps
}

export class FrontendEndpoint extends BaseEndpoint implements IFrontendEndpoint {
  bucket: Bucket
  invalidationItems: string[] | undefined
  responseHeaderOverrides?: ResponseHeadersPolicyProps | undefined

  constructor({ pathPattern, bucket, invalidationItems, responseHeaderOverrides }: FrontendEndpointProps) {
    super({ pathPattern })
    this.bucket = bucket
    this.invalidationItems = invalidationItems
    this.responseHeaderOverrides = responseHeaderOverrides
  }
}

export class LambdaEndpoint extends BaseEndpoint {
  lambdaFunction: EdgeAPILambda
  isStatic: boolean | undefined
  methods: HttpMethod[] | undefined
  responseHeaderOverrides: ResponseHeadersPolicyProps | undefined

  constructor({ pathPattern, lambdaFunction, isStatic, methods, responseHeaderOverrides }: LambdaEndpointProps) {
    super({ pathPattern })
    this.lambdaFunction = lambdaFunction
    this.isStatic = isStatic
    this.methods = methods
    this.responseHeaderOverrides = responseHeaderOverrides
  }
}

export class ProxyEndpoint extends BaseEndpoint {
  destination: Destination
  responseHeaderOverrides: ResponseHeadersPolicyProps | undefined

  customMiddlewares: (RequestMiddleware | ResponseMiddleware)[] | undefined
  disableBuiltInMiddlewares: DisableBuiltInMiddlewares | undefined
  insecure: boolean | undefined
  methods: HttpMethod[] | undefined
  originResponseInterceptor: EdgeAPILambda | undefined

  constructor({
    destination,
    pathPattern,
    customMiddlewares,
    disableBuiltInMiddlewares,
    insecure,
    methods,
    originResponseInterceptor,
    responseHeaderOverrides,
  }: ProxyEndpointProps) {
    super({
      pathPattern,
    })
    this.destination = destination
    this.responseHeaderOverrides = responseHeaderOverrides

    this.customMiddlewares = customMiddlewares
    this.disableBuiltInMiddlewares = disableBuiltInMiddlewares
    this.insecure = insecure
    this.methods = methods
    this.originResponseInterceptor = originResponseInterceptor
  }
}

export class RedirectionEndpoint extends BaseEndpoint {
  destination: Destination
  redirect: boolean
  responseHeaderOverrides?: ResponseHeadersPolicyProps | undefined

  constructor({ destination, pathPattern, redirect, responseHeaderOverrides }: RedirectionEndpointProps) {
    super({
      pathPattern,
    })
    this.destination = destination
    this.redirect = redirect
    this.responseHeaderOverrides = responseHeaderOverrides
  }
}

export type Endpoint = RedirectionEndpoint | FrontendEndpoint | LambdaEndpoint | ProxyEndpoint

export interface IEndpoint extends IBaseEndpoint {
  pathPattern: string
}

export interface IBaseEndpoint {}

export interface EdgeAPIProps {
  readonly devMode?: boolean
  readonly domains: string[]
  readonly certificate: ICertificate
  readonly defaultEndpoint: IBaseEndpoint
  readonly webAclId?: string
  readonly defaultResponseHeaderOverrides?: ResponseHeaderOverrides
}

export const endpointIsLambdaEndpoint = (endpoint: Endpoint): endpoint is LambdaEndpoint => {
  return endpoint instanceof LambdaEndpoint
}

export const endpointIsFrontendEndpoint = (endpoint: Endpoint): endpoint is FrontendEndpoint => {
  return endpoint instanceof FrontendEndpoint
}

export const endpointIsProxyEndpoint = (endpoint: Endpoint): endpoint is ProxyEndpoint => {
  return endpoint instanceof ProxyEndpoint
}

export const endpointIsRedirectionEndpoint = (endpoint: Endpoint): endpoint is RedirectionEndpoint => {
  return endpoint instanceof RedirectionEndpoint
}
