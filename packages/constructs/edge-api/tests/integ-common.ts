import { App, Stack } from '@reapit-cdk/integration-tests'
import { ARecord, HostedZone } from 'aws-cdk-lib/aws-route53'
import { EdgeAPI, EdgeAPILambda } from '../dist'
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager'
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment'
import { Bucket } from 'aws-cdk-lib/aws-s3'
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda'
import { CfnOutput } from 'aws-cdk-lib'

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
  const parentDomainName = process.env.INTEG_DOMAIN ?? ''
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
  })

  new ARecord(stack, 'arecord', {
    zone,
    recordName: domainName,
    target: api.route53Target,
  })

  const bucket = new Bucket(stack, 'bucket')
  new BucketDeployment(stack, 'deployment', {
    destinationBucket: bucket,
    sources: [Source.data('index.html', '<h1>it works!</h1>')],
  })

  api.addEndpoint({
    bucket,
    pathPattern: '/bucket',
  })

  api.addEndpoint({
    pathPattern: '/get',
    destination: 'httpbin.org',
  })

  api.addEndpoint({
    pathPattern: '/api',
    lambda: new EdgeAPILambda(stack, 'lambda', {
      code: Code.fromInline(
        devMode
          ? 'export const handler = async (event) => JSON.parse(Buffer.from(event.headers.env, "base64").toString("utf-8"))'
          : 'export const handler = async (event) => ({ status: 200, bodyEncoding: "text", body: JSON.stringify(JSON.parse(event.Records[0].cf.request.origin.s3.customHeaders.env[0].value)) })',
      ),
      handler: 'index.handler',
      runtime: Runtime.NODEJS_18_X,
      environment: {
        aVariable: 'contents',
      },
    }),
  })

  new CfnOutput(stack, 'output', {
    value: `https://${domainName}`,
  })

  return app
}
