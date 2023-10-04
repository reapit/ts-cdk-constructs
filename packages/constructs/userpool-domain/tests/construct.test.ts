import { Template } from 'aws-cdk-lib/assertions'
import * as cdk from 'aws-cdk-lib'
import { UserPoolDomain } from '../src'
import { CfnUserPool, UserPool } from 'aws-cdk-lib/aws-cognito'

const synth = () => {
  const app = new cdk.App()
  const stack = new cdk.Stack(app)
  const userPool = new UserPool(stack, 'userpool')
  const userpoolDomain = new UserPoolDomain(stack, 'domain', {
    userPool,
  })
  const template = Template.fromStack(stack)
  return {
    userpoolDomain,
    template,
    userPool,
    stack,
  }
}

describe('userpool-domain', () => {
  test('synthesizes', () => {
    const { userpoolDomain, template } = synth()
    expect(userpoolDomain).toBeDefined()
    expect(template).toBeDefined()
  })
  test('creates the lambda', () => {
    const { template } = synth()
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'lambda.onEvent',
    })
  })
  test('the lambda has the right permissions', () => {
    const { template, userPool, stack } = synth()
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: ['cognito-idp:DescribeUserPool', 'cognito-idp:CreateUserPoolDomain'],
            Resource: {
              'Fn::GetAtt': [stack.getLogicalId(userPool.node.defaultChild as CfnUserPool), 'Arn'],
            },
          },
        ],
      },
    })
  })
  test('creates custom resource with lambda', () => {
    const { template, userPool, stack } = synth()
    template.hasResourceProperties('AWS::CloudFormation::CustomResource', {
      userPoolId: {
        Ref: stack.getLogicalId(userPool.node.defaultChild as CfnUserPool),
      },
    })
  })
  test('the construct has the right property', () => {
    const { userpoolDomain } = synth()
    expect(userpoolDomain.domain).toBeTruthy()
  })
})
