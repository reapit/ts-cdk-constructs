import { Template } from 'aws-cdk-lib/assertions'
import * as cdk from 'aws-cdk-lib'
import { ReplicatedSecret } from '../src'
import { ReplicatedKey } from '@reapit-cdk/replicated-key'

const synth = (region: string = 'eu-west-2') => {
  const app = new cdk.App()
  const stack = new cdk.Stack(app, 'stack', {
    env: {
      region,
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
const masterKeyLogicalId = 'keyresource49C04B4F'

const regionalKeyArn = (masterLogicalId: string, region: string) => ({
  'Fn::Join': [
    '',
    [
      'arn:',
      {
        Ref: 'AWS::Partition',
      },
      `:kms:${region}:`,
      {
        Ref: 'AWS::AccountId',
      },
      ':key/',
      {
        'Fn::Select': [
          1,
          {
            'Fn::Split': [
              '/',
              {
                'Fn::Select': [
                  5,
                  {
                    'Fn::Split': [
                      ':',
                      {
                        'Fn::GetAtt': [masterLogicalId, 'Arn'],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  ],
})

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
    expect(replicatedSecret).toBeDefined()
    expect(template()).toBeDefined()
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
    expect(statements).toHaveLength(6)
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
    expect(statements.find(({ Resource }) => Resource.Ref === masterSecretLogicalId)).toBeDefined()
    console.log(JSON.stringify(statements, null, 2))
    expect(
      statements.find(
        ({ Resource }) => JSON.stringify(Resource) === JSON.stringify({ 'Fn::GetAtt': [masterKeyLogicalId, 'Arn'] }),
      ),
    ).toBeDefined()
    expect(
      statements.find(
        ({ Resource }) =>
          JSON.stringify(Resource) === JSON.stringify(regionalSecretArn(masterSecretLogicalId, 'af-south-1')),
      ),
    ).toBeDefined()
    expect(
      statements.find(
        ({ Resource }) =>
          JSON.stringify(Resource) === JSON.stringify(regionalSecretArn(masterSecretLogicalId, 'cn-north-1')),
      ),
    ).toBeDefined()
    expect(
      statements.find(
        ({ Resource }) => JSON.stringify(Resource) === JSON.stringify(regionalKeyArn(masterKeyLogicalId, 'af-south-1')),
      ),
    ).toBeDefined()
    expect(
      statements.find(
        ({ Resource }) => JSON.stringify(Resource) === JSON.stringify(regionalKeyArn(masterKeyLogicalId, 'cn-north-1')),
      ),
    ).toBeDefined()
  })

  test('grantWrite', () => {
    const { stack, replicatedSecret, template } = synth()
    const lambda = new cdk.aws_lambda.Function(stack, 'testLambda', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      handler: 'lambda.handler',
      code: cdk.aws_lambda.Code.fromInline('export const handler = () => {}'),
    })
    replicatedSecret.grantWrite(lambda)
    const kmsAction = ['kms:Decrypt', 'kms:Encrypt', 'kms:ReEncrypt*', 'kms:GenerateDataKey*']
    const secretAction = ['secretsmanager:PutSecretValue', 'secretsmanager:UpdateSecret']
    const policies = template().findResources('AWS::IAM::Policy')
    const policy = policies['testLambdaServiceRoleDefaultPolicy7BD4BE98']
    const statements: any[] = policy.Properties.PolicyDocument.Statement
    expect(statements).toHaveLength(6)
    console.log(JSON.stringify(statements, null, 2))
    expect(
      statements.filter((statement) => {
        return JSON.stringify(statement.Action) === JSON.stringify(kmsAction)
      }),
    ).toHaveLength(3)
    expect(
      statements.filter((statement) => {
        return JSON.stringify(statement.Action) === JSON.stringify(secretAction)
      }),
    ).toHaveLength(3)
    expect(statements.find(({ Resource }) => Resource.Ref === masterSecretLogicalId)).toBeDefined()
    console.log(JSON.stringify(statements, null, 2))
    expect(
      statements.find(
        ({ Resource }) => JSON.stringify(Resource) === JSON.stringify({ 'Fn::GetAtt': [masterKeyLogicalId, 'Arn'] }),
      ),
    ).toBeDefined()
    expect(
      statements.find(
        ({ Resource }) =>
          JSON.stringify(Resource) === JSON.stringify(regionalSecretArn(masterSecretLogicalId, 'af-south-1')),
      ),
    ).toBeDefined()
    expect(
      statements.find(
        ({ Resource }) =>
          JSON.stringify(Resource) === JSON.stringify(regionalSecretArn(masterSecretLogicalId, 'cn-north-1')),
      ),
    ).toBeDefined()
    expect(
      statements.find(
        ({ Resource }) => JSON.stringify(Resource) === JSON.stringify(regionalKeyArn(masterKeyLogicalId, 'af-south-1')),
      ),
    ).toBeDefined()
    expect(
      statements.find(
        ({ Resource }) => JSON.stringify(Resource) === JSON.stringify(regionalKeyArn(masterKeyLogicalId, 'cn-north-1')),
      ),
    ).toBeDefined()
  })
})
