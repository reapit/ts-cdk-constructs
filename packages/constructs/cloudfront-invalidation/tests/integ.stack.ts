import { App, Stack } from '@reapit-cdk/integration-tests'
import { Distribution, PriceClass } from 'aws-cdk-lib/aws-cloudfront'
import { HttpOrigin } from 'aws-cdk-lib/aws-cloudfront-origins'
import { CloudfrontInvalidation } from '../src'
import { CfnOutput } from 'aws-cdk-lib'

const app = new App()

const stack = new Stack(app, 'cloudfront-invalidation-stack')
const distribution = new Distribution(stack, 'distribution', {
  defaultBehavior: {
    origin: new HttpOrigin('example.org'),
  },
  priceClass: PriceClass.PRICE_CLASS_100,
})

const items = ['/index.html', '/something-else']

new CloudfrontInvalidation(stack, 'invalidation', {
  distribution,
  items,
  invalidateOnCreation: true,
})

new CfnOutput(stack, 'output', {
  value: distribution.distributionId,
})
