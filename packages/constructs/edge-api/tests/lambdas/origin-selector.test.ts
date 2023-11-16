import { handler } from '../../src/lambdas/origin-selector'

const genEvent = (reqHost: string, env: any) => ({
  Records: [
    {
      cf: {
        config: {
          distributionDomainName: 'dy19nbz8r86ng.cloudfront.net',
          distributionId: 'EAVSTBWLNZNCR',
          eventType: 'origin-request',
          requestId: 'teFGm2nHHt29ohwMRXZ3dP0sD3LSMm79fe8keY2rJKmaQuheKHGvEw==',
        },
        request: {
          clientIp: '1.1.1.1',
          headers: {
            host: [{ key: 'Host', value: 'fjklsdfjlkds.org' }],
            'req-host': [{ key: 'req-host', value: reqHost }],
            'cloudfront-is-mobile-viewer': [{ key: 'CloudFront-Is-Mobile-Viewer', value: 'false' }],
            'cloudfront-is-tablet-viewer': [{ key: 'CloudFront-Is-Tablet-Viewer', value: 'false' }],
            'cloudfront-is-smarttv-viewer': [{ key: 'CloudFront-Is-SmartTV-Viewer', value: 'false' }],
            'cloudfront-is-desktop-viewer': [{ key: 'CloudFront-Is-Desktop-Viewer', value: 'true' }],
            'cloudfront-is-ios-viewer': [{ key: 'CloudFront-Is-IOS-Viewer', value: 'false' }],
            'cloudfront-is-android-viewer': [{ key: 'CloudFront-Is-Android-Viewer', value: 'false' }],
            cookie: [
              {
                key: 'Cookie',
                value: 'a=b',
              },
            ],
            'accept-language': [{ key: 'Accept-Language', value: 'en-US,en;q=0.9' }],
            accept: [
              {
                key: 'Accept',
                value:
                  'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
              },
            ],
            referer: [{ key: 'Referer', value: 'https://github.com/' }],
            'cloudfront-forwarded-proto': [{ key: 'CloudFront-Forwarded-Proto', value: 'https' }],
            'x-forwarded-for': [{ key: 'X-Forwarded-For', value: '1.1.1.1' }],
            'user-agent': [
              {
                key: 'User-Agent',
                value:
                  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
              },
            ],
            via: [{ key: 'Via', value: '1.1 74763761cf5c5595710a6df4d17dd64e.cloudfront.net (CloudFront)' }],
            'sec-ch-ua': [
              { key: 'sec-ch-ua', value: '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"' },
            ],
            'sec-ch-ua-mobile': [{ key: 'sec-ch-ua-mobile', value: '?0' }],
            'sec-ch-ua-platform': [{ key: 'sec-ch-ua-platform', value: '"macOS"' }],
            'upgrade-insecure-requests': [{ key: 'upgrade-insecure-requests', value: '1' }],
            'sec-fetch-site': [{ key: 'sec-fetch-site', value: 'cross-site' }],
            'sec-fetch-mode': [{ key: 'sec-fetch-mode', value: 'navigate' }],
            'sec-fetch-user': [{ key: 'sec-fetch-user', value: '?1' }],
            'sec-fetch-dest': [{ key: 'sec-fetch-dest', value: 'document' }],
            'accept-encoding': [{ key: 'accept-encoding', value: 'gzip, deflate, br' }],
            'rpt-host': [{ key: 'rpt-host', value: 'rc-preview-106.dev.paas.reapit.cloud' }],
            'cloudfront-viewer-http-version': [{ key: 'CloudFront-Viewer-HTTP-Version', value: '2.0' }],
            'cloudfront-viewer-country': [{ key: 'CloudFront-Viewer-Country', value: 'GB' }],
            'cloudfront-viewer-country-name': [{ key: 'CloudFront-Viewer-Country-Name', value: 'United Kingdom' }],
            'cloudfront-viewer-country-region': [{ key: 'CloudFront-Viewer-Country-Region', value: 'ENG' }],
            'cloudfront-viewer-country-region-name': [
              { key: 'CloudFront-Viewer-Country-Region-Name', value: 'England' },
            ],
            'cloudfront-viewer-city': [{ key: 'CloudFront-Viewer-City', value: 'Sheffield' }],
            'cloudfront-viewer-postal-code': [{ key: 'CloudFront-Viewer-Postal-Code', value: 'S2' }],
            'cloudfront-viewer-time-zone': [{ key: 'CloudFront-Viewer-Time-Zone', value: 'Europe/London' }],
            'cloudfront-viewer-latitude': [{ key: 'CloudFront-Viewer-Latitude', value: '53.37930' }],
            'cloudfront-viewer-longitude': [{ key: 'CloudFront-Viewer-Longitude', value: '-1.46020' }],
            'cloudfront-viewer-address': [{ key: 'CloudFront-Viewer-Address', value: '81.187.40.100:64277' }],
            'cloudfront-viewer-tls': [
              { key: 'CloudFront-Viewer-TLS', value: 'TLSv1.3:TLS_AES_128_GCM_SHA256:fullHandshake' },
            ],
            'cloudfront-viewer-asn': [{ key: 'CloudFront-Viewer-ASN', value: '20712' }],
          },
          method: 'GET',
          origin: {
            custom: {
              customHeaders: {
                env: [
                  {
                    key: 'env',
                    value: JSON.stringify(env),
                  },
                ],
              },
              domainName: 'example.org',
              keepaliveTimeout: 5,
              path: '',
              port: 443,
              protocol: 'https',
              readTimeout: 30,
              sslProtocols: ['TLSv1.2'],
            },
          },
          querystring:
            'response_type=code&client_id=asdf&state=14af2312-f3df-401e-b7f2-47131b97bfc7&redirect_uri=https://example.org',
          uri: '/',
        },
      },
    },
  ],
})

describe('origin selector', () => {
  it('should select a domain-mapped origin based on the req-host and env headers', async () => {
    const env = {
      domainMapping: {
        'example.org': {
          destination: 'somewhere.org',
        },
        'example.com': {
          destination: 'somewhere.com',
        },
      },
    }
    const result = await handler(genEvent('example.org', env) as any)
    if (!result.origin) {
      throw new Error('no origin on result')
    }
    expect(result.origin.custom?.domainName).toBe('somewhere.org')
    expect(result.headers['host'][0].value).toBe('somewhere.org')

    const result2 = await handler(genEvent('example.com', env) as any)
    if (!result2.origin) {
      throw new Error('no origin on result')
    }
    expect(result2.origin.custom?.domainName).toBe('somewhere.com')
    expect(result2.headers['host'][0].value).toBe('somewhere.com')
  })

  it('should select a domain-mapped origin based on the req-host and env headers', async () => {
    const env = {
      domainMapping: {
        'example.org': 'somewhere.org',
        'example.com': 'somewhere.com',
      },
    }
    const result = await handler(genEvent('example.org', env) as any)
    if (!result.origin) {
      throw new Error('no origin on result')
    }
    expect(result.origin.custom?.domainName).toBe('somewhere.org')
    expect(result.headers['host'][0].value).toBe('somewhere.org')

    const result2 = await handler(genEvent('example.com', env) as any)
    if (!result2.origin) {
      throw new Error('no origin on result')
    }
    expect(result2.origin.custom?.domainName).toBe('somewhere.com')
    expect(result2.headers['host'][0].value).toBe('somewhere.com')
  })

  it('should filter the host from the url', async () => {
    const env = {
      domainMapping: {
        'example.org': 'https://somewhere.org',
        'example.com': 'https://somewhere.com/',
      },
    }
    const result = await handler(genEvent('example.org', env) as any)
    if (!result.origin) {
      throw new Error('no origin on result')
    }
    expect(result.origin.custom?.domainName).toBe('somewhere.org')
    expect(result.headers['host'][0].value).toBe('somewhere.org')

    const result2 = await handler(genEvent('example.com', env) as any)
    if (!result2.origin) {
      throw new Error('no origin on result')
    }
    expect(result2.origin.custom?.domainName).toBe('somewhere.com')
    expect(result2.headers['host'][0].value).toBe('somewhere.com')
  })
})
