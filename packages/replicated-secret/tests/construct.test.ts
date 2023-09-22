import { Template } from 'aws-cdk-lib/assertions'
import * as cdk from 'aws-cdk-lib'
import { ReplicatedSecret } from '../src'
import { ReplicatedKey } from '@reapit-cdk/replicated-key'

const synth = () => {
  const app = new cdk.App()
  const stack = new cdk.Stack(app, 'stack', {
    env: {
      region: 'eu-west-2',
    },
  })
  const replicatedKey = new ReplicatedKey(stack, 'key', {
    replicaRegions: ['af-south-1', 'cn-north-1'],
  })
  const replicatedSecret = new ReplicatedSecret(stack, 'secret', {
    replicaRegions: ['af-south-1', 'cn-north-1'],
    replicatedKey,
  })

  return {
    replicatedSecret,
    template: () => Template.fromStack(stack),
    stack,
  }
}

const masterSecretLogicalId = 'secret4DA88516'

const regionalSecretArn = (masterLogicalId: string, region: string) => ({
  'Fn::Join': [
    '',
    [
      'arn:',
      {
        Ref: 'AWS::Partition',
      },
      `:secretsmanager:${region}:`,
      {
        Ref: 'AWS::AccountId',
      },
      ':secret:',
      {
        'Fn::Select': [
          6,
          {
            'Fn::Split': [
              ':',
              {
                Ref: masterLogicalId,
              },
            ],
          },
        ],
      },
    ],
  ],
})

describe('replicated-secret', () => {
  test('synthesizes', () => {
    const { replicatedSecret, template } = synth()
    expect(replicatedSecret)
    expect(template())
  })
  test('getRegionalSecret', () => {
    const { replicatedSecret } = synth()
    expect(replicatedSecret.getRegionalSecret('eu-west-2'))
    expect(replicatedSecret.getRegionalSecret('af-south-1'))
    expect(replicatedSecret.getRegionalSecret('cn-north-1'))
    expect(() => replicatedSecret.getRegionalSecret('us-east-1')).toThrowError(
      new Error('No secret in region us-east-1'),
    )
  })

  test('grantRead', () => {
    const { stack, replicatedSecret, template } = synth()
    const lambda = new cdk.aws_lambda.Function(stack, 'testLambda', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      handler: 'lambda.handler',
      code: cdk.aws_lambda.Code.fromInline('export const handler = () => {}'),
    })
    replicatedSecret.grantRead(lambda)
    const policies = template().findResources('AWS::IAM::Policy')
    const policy = policies['testLambdaServiceRoleDefaultPolicy7BD4BE98']
    const statements: any[] = policy.Properties.PolicyDocument.Statement
    console.log(JSON.stringify(statements, null, 2))
    expect(
      statements.filter((statement) => {
        return statement.Action === 'kms:Decrypt'
      }),
    ).toHaveLength(3)
    expect(
      statements.filter((statement) => {
        return (
          statement.Action.includes('secretsmanager:GetSecretValue') &&
          statement.Action.includes('secretsmanager:DescribeSecret')
        )
      }),
    ).toHaveLength(3)
  })
})
