import { IntegTest, ExpectedResult, App } from '@reapit-cdk/integration-tests'
import { Stack } from 'aws-cdk-lib'

import { UserPoolDomain } from '../dist'
import { UserPool } from 'aws-cdk-lib/aws-cognito'

const app = new App()

const stack = new Stack(app, 'userpool-domain-test-stack')
const userPool = new UserPool(stack, 'userpool')

const userpoolDomain = new UserPoolDomain(stack, 'domain', {
  userPool,
})

const integ = new IntegTest(app, 'UserpoolDomainTest', {
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
  .awsApiCall('cognito-idp', 'DescribeUserPool', {
    UserPoolId: userPool.userPoolId,
  })
  .expect(
    ExpectedResult.objectLike({
      UserPool: {
        Domain: userpoolDomain.domain,
      },
    }),
  )

assertion.provider.addToRolePolicy({
  Effect: 'Allow',
  Action: ['cognito-idp:DescribeUserPool'],
  Resource: ['*'],
})
