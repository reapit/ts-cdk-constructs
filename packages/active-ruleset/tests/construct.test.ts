import { Template } from 'aws-cdk-lib/assertions'
import * as cdk from 'aws-cdk-lib'
import { ActiveRuleset } from '../src'

const synth = () => {
  const app = new cdk.App()
  const stack = new cdk.Stack(app)
  const activeRuleset = new ActiveRuleset(stack, 'active-ruleset')
  const template = Template.fromStack(stack)
  return {
    activeRuleset,
    template,
    stack,
  }
}

describe('active-ruleset', () => {
  test('synthesizes', () => {
    const { activeRuleset, template } = synth()
    expect(activeRuleset).toBeDefined()
    expect(template).toBeDefined()
  })
  test('creates the lambda', () => {
    const { template } = synth()
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'lambda.onEvent',
    })
  })
  test('the lambda has the right permissions', () => {
    const { template } = synth()
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'ses:DescribeActiveReceiptRuleSet',
              'ses:CreateReceiptRuleSet',
              'ses:SetActiveReceiptRuleSet',
              'ses:DescribeReceiptRuleSet',
              'ses:DeleteReceiptRuleSet',
            ],
            Resource: '*',
          },
        ],
      },
    })
  })
  test('creates custom resource with lambda', () => {
    const { template } = synth()
    template.hasResource('AWS::CloudFormation::CustomResource', {})
  })
  test('the construct has the right property', () => {
    const { activeRuleset } = synth()
    expect(activeRuleset.receiptRuleSet).toBeTruthy()
  })
})
