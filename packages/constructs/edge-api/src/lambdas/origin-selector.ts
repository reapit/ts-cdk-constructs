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
  let domainName = typeof mapping === 'string' ? mapping : mapping.destination
  if (domainName.includes('//')) {
    domainName = domainName.split('//')[1].split('/')[0]
  }
  req.origin = {
    custom: {
      ...req.origin.custom,
      domainName,
    },
  }
  req.headers['host'] = [
    {
      key: 'host',
      value: domainName,
    },
  ]

  for (const middleware of middlewares) {
    try {
      await eval(middleware)(req, mapping)
    } catch (e) {
      console.error(e)
    }
  }

  return req
}
