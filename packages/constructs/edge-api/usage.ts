import { Stack, App } from 'aws-cdk-lib'
import { ARecord, HostedZone } from 'aws-cdk-lib/aws-route53'
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda'
import { Bucket } from 'aws-cdk-lib/aws-s3'
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager'

import { EdgeAPI, EdgeAPILambda } from '@reapit-cdk/edge-api'

const app = new App()

const stack = new Stack(app, 'stack-name', {
  env: {
    region: 'us-east-1', // region must be specified, and must be us-east-1 in production
  },
})

const certificate = new Certificate(stack, 'certificate', {
  domainName: 'example.org',
})

const api = new EdgeAPI(stack, 'api', {
  certificate,
  domains: ['example.org', 'example.com'],
  devMode: false, // optional, defaults to false
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
  static: false, // optional, set to true to have the response cached until the next deployment
})

api.addEndpoint({
  pathPattern: '/frontend', // this will route /frontend and /frontend/* to the bucket
  bucket: new Bucket(stack, 'bucket'),
  invalidationItems: ['/index.html', '/config.js'], // optional, (relative to the pathPattern), set to invalidate these paths after deployment
})

api.addEndpoint({
  pathPattern: '/google',
  destination: 'google.com', // domain name only, will use https://

  // optional
  disableBuiltInMiddlewares: {
    // by default cookie domains will be rewritten from the destination (google.com)
    // to the domain the user requested (example.org or example.com)
    cookie: true,
    // by default redirects will be rewritten from the destination (google.com)
    // to the domain the user requested (example.org or example.com)
    redirect: true,
  },
})

api.addEndpoint({
  pathPattern: '/search',
  destination: {
    'example.org': 'google.com',
    'example.com': 'bing.com',
  },
})

api.addEndpoint({
  pathPattern: '/dynamic-search',

  destination: {
    'example.org': {
      destination: 'google.com',
      defaultSearchTerm: 'apples',
    },
    'example.com': {
      destination: 'bing.com',
      defaultSearchTerm: 'bananas',
    },
  },

  // optional
  customMiddlewares: [
    (req, mapping) => {
      // req is CloudfrontRequest https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/aws-lambda/common/cloudfront.d.ts#L44
      // mapping is destination['user requested domain name'] e.g. mapping['example.org']
      // req is mutable, modify it instead of returning a new object
      if (!req.querystring.includes('q=')) {
        if (typeof mapping !== 'string') {
          req.querystring = `q=${mapping.defaultSearchTerm}`
        }
      }
    },
  ],
})

const zone = HostedZone.fromLookup(stack, 'zone', {
  domainName: 'example.org',
})
new ARecord(stack, 'arecord', {
  zone,
  recordName: 'example.org',
  target: api.route53Target,
})
