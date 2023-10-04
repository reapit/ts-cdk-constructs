import { APIGatewayProxyEventHeaders, APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'

const getEnv = (headers: APIGatewayProxyEventHeaders): Record<string, string> => {
  const envHeader = headers.env
  const env = envHeader ? JSON.parse(Buffer.from(envHeader, 'base64').toString('utf-8')) : {}
  return env
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const { headers, rawQueryString, rawPath } = event

  const { destination } = getEnv(headers)
  const location = `${destination}${rawPath}${rawQueryString ? '?' + rawQueryString : ''}`

  return {
    statusCode: 302,
    headers: {
      location,
    },
  }
}
