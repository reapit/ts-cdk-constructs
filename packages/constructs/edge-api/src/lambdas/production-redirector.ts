import { CloudFrontRequest, CloudFrontRequestEvent, CloudFrontResponse } from 'aws-lambda'
import { Destination } from '../types'

const getEnv = (event: CloudFrontRequest): Record<string, any> => {
  const str = event.origin?.s3?.customHeaders['env']?.[0]?.value
  return str ? JSON.parse(str) : {}
}

const pickDestination = (destination: Destination, host: string): string => {
  if (typeof destination === 'string') {
    return destination
  }
  const map = destination[host]
  if (!map) {
    throw new Error(`Unable to find destination from ${JSON.stringify(destination)} for host "${host}"`)
  }
  if (typeof map === 'string') {
    return map
  }
  if (typeof map.destination === 'string') {
    return map.destination
  }
  throw new Error(`Unable to find destination from ${JSON.stringify(destination)} for host "${host}"`)
}

const ensureHTTPS = (url: string): string => {
  if (!url.startsWith('https://')) {
    return `https://${url}`
  }
  return url
}

export const handler = async (event: CloudFrontRequestEvent): Promise<CloudFrontResponse> => {
  try {
    const [Record] = event.Records
    if (!Record) {
      throw new Error('no Record present')
    }
    const req = Record.cf.request
    const hostHeaders = req.headers['host']
    if (!hostHeaders?.length) {
      throw new Error('no host header present')
    }
    const host = hostHeaders[0].value
    if (!host) {
      throw new Error('no host header present')
    }

    const { destination } = getEnv(req) as { destination?: Destination }
    if (!destination) {
      throw new Error('no destination present on request')
    }

    const location = ensureHTTPS(pickDestination(destination, host))

    const { uri, querystring } = req
    const value = `${location}${uri}${querystring ? `?${querystring}` : ''}`

    return {
      status: '302',
      statusDescription: 'Found',
      headers: {
        location: [
          {
            key: 'location',
            value,
          },
        ],
      },
    }
  } catch (e) {
    console.log(JSON.stringify(event))
    console.error(e)
    return {
      status: '302',
      statusDescription: 'Found',
      headers: {
        location: [
          {
            key: 'location',
            value: `/error?${new URLSearchParams({
              error: (e as Error).name,
              message: (e as Error).message,
            }).toString()}`,
          },
        ],
      },
    }
  }
}
