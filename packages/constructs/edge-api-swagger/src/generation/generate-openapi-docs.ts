import { InfoObject } from 'openapi3-ts/oas30'
import { getEndpointHandlerInfo, endpointHandlersToOpenApi, EndpointsInput } from '.'

export const generateOpenAPIDocs = ({
  endpointsInput,
  url,
  info,
}: {
  endpointsInput: EndpointsInput
  url: string
  info?: InfoObject
}) => {
  const endpointHandlerInfo = getEndpointHandlerInfo(endpointsInput)
  return endpointHandlersToOpenApi(endpointHandlerInfo, url, info).getSpec()
}
