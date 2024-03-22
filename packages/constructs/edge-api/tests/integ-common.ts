import { App, Stack } from '@reapit-cdk/integration-tests'
import { ARecord, HostedZone } from 'aws-cdk-lib/aws-route53'
import { EdgeAPI, EdgeAPILambda, RedirectionEndpoint, FrontendEndpoint, LambdaEndpoint, ProxyEndpoint } from '../dist'
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager'
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment'
import { Bucket } from 'aws-cdk-lib/aws-s3'
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda'
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib'
import { HeadersFrameOption } from 'aws-cdk-lib/aws-cloudfront'

export const edgeAPITest = (devMode?: boolean) => {
  const app = new App()

  const env = devMode
    ? undefined
    : {
        account: process.env.AWS_ACCOUNT,
        region: 'us-east-1',
      }

  if (!process.env.INTEG_DOMAIN) {
    throw new Error('process.env.INTEG_DOMAIN required')
  }
  const parentDomainName = process.env.INTEG_DOMAIN
  if (!process.env.INTEG_ZONE_ID) {
    throw new Error('process.env.INTEG_ZONE_ID required')
  }
  const stack = new Stack(app, 'edge-api-test-stack' + (devMode ? '-dev' : ''), { env })

  const zone = HostedZone.fromHostedZoneAttributes(stack, 'zone', {
    hostedZoneId: process.env.INTEG_ZONE_ID,
    zoneName: parentDomainName,
  })

  const domainName = `edge-api-test-${devMode ? 'dev' : 'prod'}.${parentDomainName}`

  const api = new EdgeAPI(stack, 'api', {
    domains: [domainName],
    devMode,
    certificate: new Certificate(stack, 'cert', {
      domainName,
      validation: CertificateValidation.fromDns(zone),
    }),
    defaultEndpoint: {
      destination: 'example.org',
    },
    defaultResponseHeaderOverrides: {
      customHeadersBehavior: {
        customHeaders: [
          {
            header: 'Server',
            override: true,
            value: '@reapit-cdk/edge-api',
          },
        ],
      },
    },
  })

  new ARecord(stack, 'arecord', {
    zone,
    recordName: domainName,
    target: api.route53Target,
  })

  const bucket = new Bucket(stack, 'bucket', {
    websiteIndexDocument: 'index.html',
    websiteErrorDocument: 'index.html',
    removalPolicy: RemovalPolicy.RETAIN, // otherwise deletion will fail on stack destroy due to non-empty bucket
    publicReadAccess: true,
    blockPublicAccess: {
      blockPublicAcls: false,
      blockPublicPolicy: false,
      ignorePublicAcls: false,
      restrictPublicBuckets: false,
    },
  })
  new BucketDeployment(stack, 'deployment', {
    destinationBucket: bucket,
    sources: [Source.data('index.html', '<h1>it works!</h1>')],
  })

  api.addEndpoint(
    new FrontendEndpoint({
      bucket,
      pathPattern: '/bucket',
      responseHeaderOverrides: {
        securityHeadersBehavior: {
          frameOptions: {
            frameOption: HeadersFrameOption.DENY,
            override: true,
          },
        },
      },
    }),
  )

  api.addEndpoint(
    new ProxyEndpoint({
      pathPattern: '/get/*',
      destination: 'httpbin.org',
      responseHeaderOverrides: {
        customHeadersBehavior: {
          customHeaders: [
            {
              header: 'Server',
              override: true,
              value: 'CERN-NextStep-WorldWideWeb.app/1.1  libwww/2.07',
            },
          ],
        },
      },
    }),
  )

  api.addEndpoint(
    new LambdaEndpoint({
      pathPattern: '/api',
      lambdaFunction: new EdgeAPILambda(stack, 'lambda', {
        code: Code.fromInline(
          devMode
            ? 'module.exports = { handler: async (event) => JSON.parse(Buffer.from(event.headers.env, "base64").toString("utf-8")) }'
            : 'module.exports = { handler: async (event) => ({ status: 200, bodyEncoding: "text", body: JSON.stringify(JSON.parse(event.Records[0].cf.request.origin.s3.customHeaders.env[0].value)) }) }',
        ),
        handler: 'index.handler',
        runtime: Runtime.NODEJS_18_X,
        environment: {
          aVariable: 'contents',
        },
      }),
      responseHeaderOverrides: {
        customHeadersBehavior: {
          customHeaders: [
            {
              header: 'X-CUSTOM-HEADER',
              override: true,
              value: 'CUSTOM-HEADER-VALUE',
            },
          ],
        },
      },
    }),
  )

  api.addEndpoint(
    new RedirectionEndpoint({
      pathPattern: '/redirect-me',
      redirect: true,
      destination: 'https://google.com',
    }),
  )

  new CfnOutput(stack, 'output', {
    value: `https://${domainName}`,
  })

  return app
}
