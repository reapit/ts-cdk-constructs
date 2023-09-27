export const handler = async (event) => {
  const req = event.Records[0].cf.request
  const res = event.Records[0].cf.response
  if (res.status[0] === '3' && res.headers.location && res.headers.location[0] && req.querystring) {
    res.headers.location[0].value += '?' + req.querystring
  }
  return res
}
