import { Stack, App } from 'aws-cdk-lib'
import { EdgeAPI, EdgeAPILambda } from '@reapit-cdk/edge-api'
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda'
import { EdgeAPISwaggerEndpoint } from '@reapit-cdk/edge-api-swagger'
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager'

const app = new App()
const stack = new Stack(app, 'stack-name')

const certificate = new Certificate(stack, 'certificate', {
  domainName: 'example.org',
})
const api = new EdgeAPI(stack, 'api', {
  certificate,
  domains: ['example.org', 'example.com'],
  devMode: false,
  defaultEndpoint: {
    destination: 'example.com',
  },
})

const lambda = new EdgeAPILambda(stack, 'lambda', {
  code: Code.fromAsset('./codebase/lambda'),
  codePath: './codebase/lambda', // gets added to the docs
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

api.addEndpoint(
  new EdgeAPISwaggerEndpoint(stack, 'docs', {
    api,
    url: 'https://example.org',

    pathPattern: '/swagger', // optional, defaults to /swagger

    // optional
    info: {
      title: '', // defaults to Edge API
      version: '', // defaults to 1.0.0
    },
  }),
)
