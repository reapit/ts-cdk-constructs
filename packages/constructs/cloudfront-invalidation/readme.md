# @reapit-cdk/cloudfront-invalidation


![npm version](https://img.shields.io/npm/v/@reapit-cdk/cloudfront-invalidation) ![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/cloudfront-invalidation) ![coverage: 99.02%25](https://img.shields.io/badge/coverage-99.02%25-green) ![Integ Tests: X](https://img.shields.io/badge/Integ Tests-X-red)

CloudFront invalidations are [very error prone](https://github.com/aws/aws-cdk/issues/15891#issuecomment-966456154), making it hard to invalidate distributions reliably. This construct aims to solve this problem by using a step function which is triggered on stack update, and uses exponential backoff to retry the invalidation. Inspired by https://github.com/aws/aws-cdk/issues/15891#issuecomment-1362163142.

## Package Installation:

```sh
yarn add --dev @reapit-cdk/cloudfront-invalidation
# or
npm install @reapit-cdk/cloudfront-invalidation --save-dev
```

## Usage
```ts
import { Stack, App } from 'aws-cdk-lib'
import { Distribution } from 'aws-cdk-lib/aws-cloudfront'
import { HttpOrigin } from 'aws-cdk-lib/aws-cloudfront-origins'

import { CloudfrontInvalidation } from '@reapit-cdk/cloudfront-invalidation'

const app = new App()
const stack = new Stack(app, 'stack-name', {
  env: {
    region: 'us-east-1', // region must be specified
  },
})
const distribution = new Distribution(stack, 'distribution', {
  defaultBehavior: {
    origin: new HttpOrigin('example.org'),
  },
})
new CloudfrontInvalidation(stack, 'invalidation', {
  distribution,
  items: ['/index.html', '/config.js'], // path patterns you want invalidated
})

```