import { IntegTest, ExpectedResult } from '@aws-cdk/integ-tests-alpha'
import { App, Aspects, Stack } from 'aws-cdk-lib'
// import { AwsSolutionsChecks } from 'cdk-nag'

import { ActiveRuleset } from '../dist'

// CDK App for Integration Tests
const app = new App()
// Add the cdk-nag AwsSolutions Pack with extra verbose logging enabled.
// Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }))

const stackUnderTest = new Stack(app, 'active-ruleset-stack')
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
