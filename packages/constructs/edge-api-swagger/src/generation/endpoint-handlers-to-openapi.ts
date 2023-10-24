import {
  ContentObject,
  InfoObject,
  OpenApiBuilder,
  PathItemObject,
  RequestBodyObject,
  ResponseObject,
  SchemaObject,
  SchemaObjectType,
} from 'openapi3-ts/oas30'
import { EndpointHandlerInfo, ResolvedProperty, ReturnType } from './types'
import { Destination } from '@reapit-cdk/edge-api'

export const endpointHandlersToOpenApi = (
  endpointHandlersInfo: EndpointHandlerInfo[],
  url: string,
  info?: InfoObject,
) => {
  const openApi = new OpenApiBuilder()
  openApi.addInfo({
    title: 'Edge API',
    version: '1.0.0',
    ...(info ?? {}),
  })
  openApi.addServer({
    url,
  })

  endpointHandlersInfo.map(transformEndpointHandler).forEach(({ path, pathItem }) => openApi.addPath(path, pathItem))

  return openApi
}

const stringIsSchemaObjectType = (str: string): str is SchemaObjectType => {
  return ['integer', 'number', 'string', 'boolean', 'array'].includes(str)
}

const propertyToSchema = (property: ResolvedProperty): SchemaObject => {
  const type = property.typeName && stringIsSchemaObjectType(property.typeName) ? property.typeName : 'object'
  const properties = property.properties?.reduce(
    (pv, cv) => {
      if (!cv.name) {
        return pv
      }
      return {
        ...pv,
        [cv.name]: propertyToSchema(cv),
      }
    },
    {} as Record<string, SchemaObject>,
  )

  return {
    type,
    required: property.properties
      ? (property.properties
          .filter((rp) => !rp.isOptional)
          .map((rp) => rp.name)
          .filter(Boolean) as string[])
      : undefined,
    properties,
  }
}

const transformBody = (body: ResolvedProperty, isForm?: boolean): RequestBodyObject => {
  const contentType = isForm ? 'application/x-www-form-urlencoded' : 'application/json'
  const content: ContentObject = {
    [contentType]: {
      schema: propertyToSchema(body),
    },
  }
  return { content }
}

const returnTypeToResponse = (returnType?: ReturnType): ResponseObject => {
  if (!returnType) {
    return {
      description: 'not typed',
    }
  }

  if (returnType.isRedirection) {
    return {
      description: 'redirection',
      headers: {
        location: {
          schema: {
            type: 'string',
            example: 'https://google.com',
          },
        },
        status: {
          schema: {
            type: 'number',
            example: 302,
          },
        },
      },
    }
  }

  if (returnType.isJSONResponse && returnType.response) {
    return {
      description: 'default',
      content: {
        'application/json': {
          schema: propertyToSchema(returnType.response),
        },
      },
    }
  }

  return {
    description: 'invalid return type',
  }
}

const destinationToDescription = (destination: Destination) => {
  if (typeof destination === 'string') {
    return `Proxy to ${destination}`
  }
  return `Domain mapped Proxy ${Object.entries(destination)
    .map(([domain, mapping]) => {
      if (typeof mapping === 'string') {
        return `from ${domain} to ${mapping}`
      }
      return `from ${domain} to ${mapping.destination}${
        Object.keys(mapping).length > 1 ? ' with mapping object ' + JSON.stringify(mapping) : ''
      }`
    })
    .join(', ')}`
}

const transformEndpointHandler = (endpointInfo: EndpointHandlerInfo): { path: string; pathItem: PathItemObject } => {
  const { bodyType, returnType, isFormRequestHandler, description, isProxy, isFrontend, proxyDestination } =
    endpointInfo
  if (isProxy) {
    if (!proxyDestination) {
      throw new Error('proxy but no proxy destination for endpoint' + endpointInfo.pathPattern)
    }
    return {
      path: endpointInfo.pathPattern,
      pathItem: {
        get: {
          description: destinationToDescription(proxyDestination),
          responses: {
            default: {
              description: 'proxy',
            },
          },
        },
      },
    }
  }
  if (bodyType) {
    return {
      path: endpointInfo.pathPattern,
      pathItem: {
        post: {
          description,
          responses: {
            default: returnTypeToResponse(returnType),
          },
          requestBody: transformBody(bodyType, isFormRequestHandler),
        },
      },
    }
  }

  if (isFrontend) {
    return {
      path: endpointInfo.pathPattern,
      pathItem: {
        get: {
          description: 'Serves bucket contents.',
          responses: {
            default: returnTypeToResponse(returnType),
          },
        },
      },
    }
  }

  return {
    path: endpointInfo.pathPattern,
    pathItem: {
      get: {
        description,
        responses: {
          default: returnTypeToResponse(returnType),
        },
      },
    },
  }
}
