import { IntegTest, ExpectedResult, App } from '@reapit-cdk/integration-tests'
import { Stack } from 'aws-cdk-lib'
import { ARecord, HostedZone } from 'aws-cdk-lib/aws-route53'
import { EdgeAPI, EdgeAPILambda } from '../dist'
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager'
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment'
import { Bucket } from 'aws-cdk-lib/aws-s3'
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda'

const app = new App()

if (!process.env.INTEG_DOMAIN) {
  throw new Error('process.env.INTEG_DOMAIN required')
}
const parentDomainName = process.env.INTEG_DOMAIN ?? ''

const stack = new Stack(app, 'edge-api-dev-test-stack')
const zone = HostedZone.fromLookup(stack, 'zone', {
  domainName: parentDomainName,
})

const domainName = 'edge-api-dev-test.' + parentDomainName

const api = new EdgeAPI(stack, 'api', {
  domains: [domainName],
  devMode: true,
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
  pathPattern: '/httpbin',
  destination: 'httpbin.org/get',
})

api.addEndpoint({
  pathPattern: '/api',
  lambda: new EdgeAPILambda(stack, 'lambda', {
    code: Code.fromInline(
      'export const handler = async (event) => JSON.parse(Buffer.from(event.headers.env, "base64").toString("utf-8"))',
    ),
    handler: 'index.handler',
    runtime: Runtime.NODEJS_18_X,
    environment: {
      aVariable: 'contents',
    },
  }),
})

const integ = new IntegTest(app, 'EdgeAPIDevTest', {
  testCases: [stack],
  cdkCommandOptions: {
    destroy: {
      args: {
        force: true,
      },
    },
  },
  diffAssets: true,
  regions: [stack.region],
})

integ.assertions
  .httpApiCall(`https://${domainName}`)
  .expect(ExpectedResult.stringLikeRegexp('Example Domain'))
  .next(integ.assertions.httpApiCall(`https://${domainName}/bucket`).expect(ExpectedResult.exact('<h1>it works!</h1>')))
  .next(
    integ.assertions.httpApiCall(`https://${domainName}/api`).expect(
      ExpectedResult.exact({
        aVariable: 'contents',
      }),
    ),
  )
  .next(
    integ.assertions.httpApiCall(`https://${domainName}/httpbin`).expect(
      ExpectedResult.objectLike({
        url: 'https://httpbin.org/get',
      }),
    ),
  )
