import { CloudFrontRequestEvent, CloudFrontRequestResult } from 'aws-lambda'

export const handler = async (event: CloudFrontRequestEvent): Promise<CloudFrontRequestResult> => {
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
