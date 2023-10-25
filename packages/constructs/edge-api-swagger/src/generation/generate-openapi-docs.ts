import { InfoObject } from 'openapi3-ts/oas30'
import { getEndpointHandlerInfo, endpointHandlersToOpenApi, EndpointsInput } from '.'

export const generateOpenAPIDocs = ({
  endpointsInput,
  url,
  info,
  repoRoot,
}: {
  endpointsInput: EndpointsInput
  url: string
  info?: InfoObject
  repoRoot?: string
}) => {
  const endpointHandlerInfo = getEndpointHandlerInfo(endpointsInput, repoRoot)
  return endpointHandlersToOpenApi(endpointHandlerInfo, url, info).getSpec()
}
