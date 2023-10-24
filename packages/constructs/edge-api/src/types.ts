import { Bucket } from 'aws-cdk-lib/aws-s3'
import { EdgeAPILambda } from './edge-api-lambda'
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager'
import { CloudFrontRequest, CloudFrontResponse } from 'aws-lambda'
import { HttpMethod } from '@aws-cdk/aws-apigatewayv2-alpha'
export { HttpMethod } from '@aws-cdk/aws-apigatewayv2-alpha'

interface BaseEndpoint {
  pathPattern: string
}

export interface LambdaEndpoint extends BaseEndpoint {
  lambda: EdgeAPILambda
  static?: boolean
  methods?: HttpMethod[]
}

export interface FrontendEndpoint extends BaseEndpoint {
  bucket: Bucket
  invalidationItems?: string[]
}

export type RequestMiddleware = (req: CloudFrontRequest, mapping: Destination) => void
export type ResponseMiddleware = (req: CloudFrontRequest, res: CloudFrontResponse, mapping: Destination) => void

export const isResponseMiddleware = (
  middleware: RequestMiddleware | ResponseMiddleware,
): middleware is ResponseMiddleware => {
  const numArgs = middleware.toString().split(')')[1].split(',').length
  return numArgs === 3
}
export const isRequestMiddleware = (
  middleware: RequestMiddleware | ResponseMiddleware,
): middleware is RequestMiddleware => {
  return !isResponseMiddleware(middleware)
}

type Destination = string | Record<string, string | { destination: string; [k: string]: string }>

export type DisableBuiltInMiddlewares = {
  cookie?: boolean
  redirect?: boolean
}

export interface ProxyEndpoint extends BaseEndpoint {
  destination: Destination
  customMiddlewares?: (RequestMiddleware | ResponseMiddleware)[]
  disableBuiltInMiddlewares?: DisableBuiltInMiddlewares
  methods?: HttpMethod[]
}

export type Endpoint = LambdaEndpoint | FrontendEndpoint | ProxyEndpoint

// TODO: there must be a better way to do this
export type DefaultEndpoint =
  | Omit<LambdaEndpoint, 'pathPattern'>
  | Omit<FrontendEndpoint, 'pathPattern'>
  | Omit<ProxyEndpoint, 'pathPattern'>

export interface EdgeAPIProps {
  devMode?: boolean
  domains: string[]
  certificate: ICertificate
  defaultEndpoint: DefaultEndpoint
  webAclId?: string
}

export const endpointIsLambdaEndpoint = (endpoint: Endpoint): endpoint is LambdaEndpoint =>
  !!(endpoint as LambdaEndpoint).lambda

export const endpointIsFrontendEndpoint = (endpoint: Endpoint): endpoint is FrontendEndpoint =>
  !!(endpoint as FrontendEndpoint).bucket

export const endpointIsProxyEndpoint = (endpoint: Endpoint): endpoint is ProxyEndpoint =>
  !!(endpoint as ProxyEndpoint).destination
