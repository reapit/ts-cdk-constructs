import { CloudFrontResponseEvent, CloudFrontResponseResult } from 'aws-lambda'

export const handler = async (event: CloudFrontResponseEvent): Promise<CloudFrontResponseResult> => {
  const req = event.Records[0].cf.request
  const res = event.Records[0].cf.response
  if (res.status.startsWith('3') && res.headers.location && res.headers.location[0] && req.querystring) {
    res.headers.location[0].value += '?' + req.querystring
  }
  return res
}
