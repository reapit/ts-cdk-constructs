import { UserPool, CfnUserPool } from 'aws-cdk-lib/aws-cognito'
import { DeleteCustomUserPoolDomain } from '../src'
import { Template } from 'aws-cdk-lib/assertions'
import * as cdk from 'aws-cdk-lib'

const synth = () => {
  const app = new cdk.App()
  const stack = new cdk.Stack(app)
  const userPool = new UserPool(stack, 'userpool')
  const deleteCustomUserPoolDomain = new DeleteCustomUserPoolDomain(stack, 'domain', {
    userPool,
  })
  const template = Template.fromStack(stack)
  return {
    deleteCustomUserPoolDomain,
    template,
    userPool,
    stack,
  }
}

describe('delete-custom-userpool-domain', () => {
  test('synthesizes', () => {
    const { deleteCustomUserPoolDomain } = synth()
    expect(deleteCustomUserPoolDomain).toBeDefined()
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
            Action: ['cognito-idp:DescribeUserPool', 'cognito-idp:DeleteUserPoolDomain'],
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
})
