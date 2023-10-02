import { IntegTest, ExpectedResult, App } from '@reapit-cdk/integration-tests'
import { Stack } from 'aws-cdk-lib'

import { ActiveRuleset } from '../dist'

const app = new App()

const stackUnderTest = new Stack(app, 'active-ruleset-stack', {
  env: {
    account: process.env.AWS_ACCOUNT,
  },
})
const activeRuleset = new ActiveRuleset(stackUnderTest, 'active-ruleset')

const integ = new IntegTest(app, 'ActiveRulesetTest', {
  testCases: [stackUnderTest],
  cdkCommandOptions: {
    destroy: {
      args: {
        force: true,
      },
    },
  },
  regions: [stackUnderTest.region],
})

const assertion = integ.assertions.awsApiCall('SES', 'DescribeActiveReceiptRuleSet', {}).expect(
  ExpectedResult.objectLike({
    Metadata: {
      Name: activeRuleset.receiptRuleSet.receiptRuleSetName,
    },
  }),
)

assertion.provider.addToRolePolicy({
  Effect: 'Allow',
  Action: ['ses:DescribeActiveReceiptRuleSet'],
  Resource: ['*'],
})
