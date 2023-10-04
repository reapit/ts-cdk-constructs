import { CloudFrontRequest, CloudFrontRequestEvent } from 'aws-lambda'

const getEnv = (event: CloudFrontRequest): Record<string, any> => {
  const header = event.origin?.custom?.customHeaders['env']
  const str = header ? header[0].value : undefined
  return str ? JSON.parse(str) : {}
}

const middlewares: string[] = []

export const handler = async (event: CloudFrontRequestEvent): Promise<CloudFrontRequest> => {
  console.log(JSON.stringify(event))
  const [Record] = event.Records
  if (!Record) {
    throw new Error('no Record present')
  }
  const req = Record.cf.request
  const reqHostHeaders = req.headers['req-host']
  if (!reqHostHeaders?.length) {
    throw new Error('no req-host header present')
  }
  const host = reqHostHeaders[0].value
  if (!host) {
    throw new Error('no req-host header present')
  }
  if (!req.origin) {
    throw new Error('no origin present on request')
  }
  if (!req.origin.custom) {
    throw new Error('no custom origin present on request')
  }
  const { domainMapping } = getEnv(req)
  const mapping = domainMapping[host]
  if (!mapping) {
    throw new Error(`no domain mapping found for host ${host}`)
  }
  req.origin = {
    custom: {
      ...req.origin.custom,
      domainName: mapping.domain,
    },
  }
  req.headers['host'] = [
    {
      key: 'host',
      value: mapping.domain,
    },
  ]

  middlewares.forEach((middleware) => {
    try {
      eval(middleware)(req, mapping)
    } catch (e) {
      console.error(e)
    }
  })

  return req
}
