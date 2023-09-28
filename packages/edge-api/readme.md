# @reapit-cdk/edge-api
This construct sets up everything necessary to receive email. The emails get stored in a dynamodb table, queryable by recipient.

This is designed to be used in end-to-end tests, with the [@reapit-cdk/edge-api-client](../edge-api-client) helper library.

## npm Package Installation:
```sh
yarn add --dev @reapit-cdk/edge-api
# or
npm install @reapit-cdk/edge-api --save-dev
```

## Usage
```ts
import { CfnOutput, Stack, App } from 'aws-cdk-lib'
import { HostedZone } from 'aws-cdk-lib/aws-route53'
import { EdgeAPI, EdgeAPILambda } from '@reapit-cdk/edge-api'

const app = new App()
const stack = new Stack(app, 'stack-name', {
  env: {
    region: 'us-east-1', // region must be specified
  },
})
const certificate = new Certificate(stack, 'certificate', {
  domainName: 'example.org',
})
const api = new EdgeAPI(stack, 'api', {
  certificate,
  domains: ['example.org'],
  defaultEndpoint: {
    destination: 'example.com',
  },
})
const lambda = new EdgeAPILambda(stack, 'lambda', {
  code: Code.fromInline('export const handler = () => {}'),
  handler: 'index.handler',
  runtime: Runtime.NODEJS_18_X,
  environment: {
    aVariable: 'contents',
  },
})
api.addEndpoint({
  pathPattern: '/api/lambda',
  lambda,
})
const zone = HostedZone.fromLookup(stack, 'zone', {
  domainName: 'example.org',
})
new ARecord(this, 'arecord', {
  zone,
  recordName: 'example.org',
  target: api.route53Target,
})
```