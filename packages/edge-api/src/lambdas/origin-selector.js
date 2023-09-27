const getEnv = (event) => {
  const header = event.origin?.custom?.customHeaders['env']
  const str = header ? header[0].value : undefined
  return str ? JSON.parse(str) : {}
}

const middlewares = []

export const handler = async (event) => {
  console.log(JSON.stringify(event))
  const req = event.Records[0].cf.request
  const host = req.headers['req-host'][0].value
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
      domainName: mapping,
    },
  }
  req.headers['host'] = [
    {
      key: 'host',
      value: mapping,
    },
  ]

  middlewares.forEach((middleware) => {
    middleware(req, mapping)
  })

  return req
}
