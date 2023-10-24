import { Destination } from '@reapit-cdk/edge-api'

export type EndpointHandlerInfo = {
  pathPattern: string
  codePath?: string
  isJsonRequestHandler?: boolean
  isFormRequestHandler?: boolean
  envType?: ResolvedProperty
  bodyType?: ResolvedProperty
  returnType?: ReturnType
  description?: string
  isFrontend?: boolean
  isProxy?: boolean
  proxyDestination?: Destination
}

export type EndpointInputItem = {
  pathPattern: string
  codePath?: string
  isFrontend?: boolean
  isProxy?: boolean
  proxyDestination?: Destination
}

export type EndpointsInput = EndpointInputItem[]

export type ResolvedProperty = {
  name?: string
  typeName?: string
  isLiteral?: boolean
  properties?: ResolvedProperty[]
  isMappedType?: boolean
  isUnionType?: boolean
  isOptional?: boolean
}

export type ReturnType = {
  response?: ResolvedProperty
  isJSONResponse?: boolean
  isRedirection?: boolean
}
