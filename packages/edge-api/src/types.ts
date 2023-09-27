import { IBucket } from 'aws-cdk-lib/aws-s3'
import { EdgeAPILambda } from './edge-api-lambda'
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager'

interface BaseEndpoint {
  pathPattern: string
}

export interface LambdaEndpoint extends BaseEndpoint {
  lambda: EdgeAPILambda
  static?: boolean
}

export interface FrontendEndpoint extends BaseEndpoint {
  bucket: IBucket
}

export interface ProxyEndpoint extends BaseEndpoint {
  destination: string | Record<string, string>
  disableMiddlewares?: {
    cookie?: true
    redirect?: true
  }
}

export type Endpoint = LambdaEndpoint | FrontendEndpoint | ProxyEndpoint

export interface EdgeAPIProps {
  devMode?: boolean
  domains: string[]
  certificate: ICertificate
  defaultEndpoint: Endpoint
}

export const endpointIsLambdaEndpoint = (endpoint: Endpoint): endpoint is LambdaEndpoint =>
  !!(endpoint as LambdaEndpoint).lambda

export const endpointIsFrontendEndpoint = (endpoint: Endpoint): endpoint is FrontendEndpoint =>
  !!(endpoint as FrontendEndpoint).bucket

export const endpointIsProxyEndpoint = (endpoint: Endpoint): endpoint is ProxyEndpoint =>
  !!(endpoint as ProxyEndpoint).destination
