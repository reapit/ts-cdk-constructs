import { handler } from '../../src/lambdas/host-forwarder'

describe('host forwarder', () => {
  it('should set the req-host header to be the host header', async () => {
    const event = {
      Records: [
        {
          cf: {
            config: {
              distributionDomainName: 'dy19nbz8r86ng.cloudfront.net',
              distributionId: 'EAVSTBWLNZNCR',
              eventType: 'viewer-request',
              requestId: 'teFGm2nHHt29ohwMRXZ3dP0sD3LSMm79fe8keY2rJKmaQuheKHGvEw==',
            },
            request: {
              clientIp: '1.1.1.1',
              headers: {
                host: [{ key: 'Host', value: 'example.org' }],
                'user-agent': [
                  {
                    key: 'User-Agent',
                    value:
                      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                  },
                ],
                cookie: [
                  {
                    key: 'Cookie',
                    value: 'a=b',
                  },
                ],
                'sec-ch-ua': [
                  { key: 'sec-ch-ua', value: '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"' },
                ],
                'sec-ch-ua-mobile': [{ key: 'sec-ch-ua-mobile', value: '?0' }],
                'sec-ch-ua-platform': [{ key: 'sec-ch-ua-platform', value: '"macOS"' }],
                'upgrade-insecure-requests': [{ key: 'upgrade-insecure-requests', value: '1' }],
                accept: [
                  {
                    key: 'accept',
                    value:
                      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                  },
                ],
                'sec-fetch-site': [{ key: 'sec-fetch-site', value: 'cross-site' }],
                'sec-fetch-mode': [{ key: 'sec-fetch-mode', value: 'navigate' }],
                'sec-fetch-user': [{ key: 'sec-fetch-user', value: '?1' }],
                'sec-fetch-dest': [{ key: 'sec-fetch-dest', value: 'document' }],
                referer: [{ key: 'referer', value: 'https://github.com/' }],
                'accept-encoding': [{ key: 'accept-encoding', value: 'gzip, deflate, br' }],
                'accept-language': [{ key: 'accept-language', value: 'en-US,en;q=0.9' }],
              },
              method: 'GET',
              querystring: '',
              uri: '/',
            },
          },
        },
      ],
    }
    const result = await handler(event as any)
    if (!result?.headers) {
      throw new Error('no headers on object')
    }
    expect(result?.headers['req-host'][0].value).toBe('example.org')
  })
})
