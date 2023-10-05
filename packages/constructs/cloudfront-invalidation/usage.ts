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
