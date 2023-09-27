export const handler = async (event) => {
  const req = event.Records[0].cf.request
  const host = req.headers['host'][0].value
  req.headers['req-host'] = [
    {
      key: 'req-host',
      value: host,
    },
  ]
  return req
}
