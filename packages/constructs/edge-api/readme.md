# @reapit-cdk/edge-api


![npm version](https://img.shields.io/npm/v/@reapit-cdk/edge-api)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/edge-api)
![coverage: 95.18%25](https://img.shields.io/badge/coverage-95.18%25-green)
![Integ Tests: ✔](https://img.shields.io/badge/Integ%20Tests-%E2%9C%94-green)

This construct creates a truly globally available API where code executes at the edge. Because changes take a long time to propagate to all edge locations, there is a `devMode` flag which will instead deploy your API to a [HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html). This is compatible with hotswapping, so [`cdk watch`](https://docs.aws.amazon.com/cdk/v2/guide/cli.html#cli-deploy-watch) works very well. In order to make it easy to develop APIs which handle both event formats and work around the environment variable limitation, I recommend you use the lightweight request wrapper [@reapit-cdk/edge-api-sdk](../../modules/edge-api-sdk) which normalises the event format and offers some extra helpers.

## Package Installation:

```sh
yarn add --dev @reapit-cdk/edge-api
# or
npm install @reapit-cdk/edge-api --save-dev
```

## Usage
```ts
import { Stack, App } from 'aws-cdk-lib'
import { ARecord, HostedZone } from 'aws-cdk-lib/aws-route53'
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda'
import { Bucket } from 'aws-cdk-lib/aws-s3'
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager'

import { EdgeAPI, EdgeAPILambda } from '@reapit-cdk/edge-api'
import { HeadersFrameOption } from 'aws-cdk-lib/aws-cloudfront'

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
  // responseHeaderOverrides accepts https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.ResponseHeadersPolicyProps.html
  responseHeaderOverrides: {
    // Prevent the site from being iframed
    securityHeadersBehavior: {
      frameOptions: {
        frameOption: HeadersFrameOption.DENY,
        override: true,
      },
    },
  },
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

// send the user to https://google.com/redirect-me
api.addEndpoint({
  pathPattern: '/redirect-me',
  redirect: true,
  destination: 'https://google.com',
})

const zone = HostedZone.fromLookup(stack, 'zone', {
  domainName: 'example.org',
})
new ARecord(stack, 'arecord', {
  zone,
  recordName: 'example.org',
  target: api.route53Target,
})

```

## How is this different to an [Edge-optimized API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-endpoint-types.html)?
With Edge-optimized API Gateways, requests are routed from the user to the nearest CloudFront Point of Presence (POP), then to the region that the API resides in, where the request is handled.

With this construct, requests are routed from the user to the nearest CloudFront Point of Presence (POP) where they are handled and returned to the user, thus reducing latency and increasing availability.

## Limitations

### Environment Variables
Your configured environment variables will not be available in `process.env`. Instead, they exist in the lambda event. In production they are available on 
```js 
JSON.parse(event.Records[0].cf.request.origin.s3.customHeaders.env[0].value)
```
and in development mode, in
```js
JSON.parse(Buffer.from(event.headers.env, 'base64').toString('utf-8'))
```

### Method Handling
Due to [Cloudfront's AllowedMethods](https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_AllowedMethods.html) there are a few limitations:
* Specifying multiple handlers for the same path is not currently possible.
* Outside of specifying a `GET` & `HEAD`, or  `GET` & `HEAD` & `OPTIONS`, you cannot limit which methods your handler will get called for. This means that if you have a `POST` handler, it'll get called for `GET`, `HEAD`, `OPTIONS`, `PUT`, `PATCH`, `POST`, and `DELETE`.

### Lambda@Edge Restrictions
[Lambda@Edge restrictions](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-functions-restrictions.html#lambda-at-edge-function-restrictions) will apply to your lambdas. Your lambdas will be executed at `origin request` with `includeBody` set to true.
The most important ones to note are:
* VPCs are not supported
* Execution duration must not exceed 30 seconds
* Request body will be truncated on input and output to 1MB
* Only NodeJS and Python is supported
* Lambda containers are not supported
* Lambda layers are not supported
* ARM is not supported