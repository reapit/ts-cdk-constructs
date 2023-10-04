import { IntegTest, ExpectedResult, App, Stack } from '@reapit-cdk/integration-tests'
import { randomUUID } from 'crypto'

import { CloudfrontInvalidation } from '../dist'
import { Distribution, PriceClass } from 'aws-cdk-lib/aws-cloudfront'
import { HttpOrigin } from 'aws-cdk-lib/aws-cloudfront-origins'

const app = new App()

const stack = new Stack(app, 'cloudfront-invalidation-stack')
const distribution = new Distribution(stack, 'distribution', {
  defaultBehavior: {
    origin: new HttpOrigin('example.org'),
  },
  priceClass: PriceClass.PRICE_CLASS_100,
})

const uuid = randomUUID()
const items = ['/index.html', `/${uuid}`]

new CloudfrontInvalidation(stack, 'invalidation', {
  distribution,
  items,
  invalidateOnCreation: true,
})
const integ = new IntegTest(app, 'CloudfrontInvalidationTest', {
  testCases: [stack],
  cdkCommandOptions: {
    destroy: {
      args: {
        force: true,
      },
    },
  },
  regions: [stack.region],
})

const assertion = integ.assertions
  .awsApiCall('cloudfront', 'ListInvalidations', {
    distributionId: distribution.distributionId,
  })
  .expect(
    ExpectedResult.objectLike({
      InvalidationList: [
        {
          Items: items,
        },
      ],
    }),
  )

assertion.provider.addToRolePolicy({
  Effect: 'Allow',
  Action: ['cloudfront:ListInvalidations'],
  Resource: ['*'],
})
