import { Template } from 'aws-cdk-lib/assertions'
import * as cdk from 'aws-cdk-lib'
import { ReplicatedKey } from '../src'
import { AWSRegion } from '@reapit-cdk/common'

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

  return {
    replicatedKey,
    template: () => Template.fromStack(stack),
    stack,
  }
}

const regionalKeyArn = (masterLogicalId: string, region: AWSRegion) => ({
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

const masterKeyLogicalId = 'keyresource49C04B4F'

describe('replicated-key', () => {
  test('synthesizes', () => {
    const { replicatedKey, template } = synth()
    expect(replicatedKey).toBeDefined()
    expect(template()).toBeDefined()
  })
  test('getRegionalKey', () => {
    const { replicatedKey } = synth()
    expect(replicatedKey.getRegionalKey('eu-west-2'))
    expect(replicatedKey.getRegionalKey('af-south-1'))
    expect(replicatedKey.getRegionalKey('cn-north-1'))
    expect(() => replicatedKey.getRegionalKey('us-east-1')).toThrowError(new Error('No key in region us-east-1'))
  })
  test('tryGetRegionalKey', () => {
    const { replicatedKey } = synth()
    expect(replicatedKey.tryGetRegionalKey('eu-west-2'))
    expect(replicatedKey.tryGetRegionalKey('af-south-1'))
    expect(replicatedKey.tryGetRegionalKey('cn-north-1'))
    expect(replicatedKey.tryGetRegionalKey('us-east-1')).toBeUndefined()
  })
  test('stack region is unresolved error', () => {
    const app = new cdk.App()
    const stack = new cdk.Stack(app, 'stack')
    expect(() => {
      new ReplicatedKey(stack, 'key', {
        replicaRegions: ['af-south-1', 'cn-north-1'],
      })
    }).toThrowError('stack region is unresolved, please explicitly specify')
  })
  test('stack region is invalid error', () => {
    const app = new cdk.App()
    const stack = new cdk.Stack(app, 'stack', {
      env: {
        region: 'invalid',
      },
    })
    expect(() => {
      new ReplicatedKey(stack, 'key', {
        replicaRegions: ['af-south-1', 'cn-north-1'],
      })
    }).toThrowError('stack region is invalid')
  })
  test('grantEncryptDecrypt', () => {
    const { replicatedKey, template, stack } = synth()
    const lambda = new cdk.aws_lambda.Function(stack, 'lambda', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      handler: 'lambda.handler',
      code: cdk.aws_lambda.Code.fromInline('export const handler = () => {}'),
    })
    replicatedKey.grantEncryptDecrypt(lambda)
    template().hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: ['kms:Decrypt', 'kms:Encrypt', 'kms:ReEncrypt*', 'kms:GenerateDataKey*'],
            Resource: {
              'Fn::GetAtt': [masterKeyLogicalId, 'Arn'],
            },
          },
          {
            Action: ['kms:Decrypt', 'kms:Encrypt', 'kms:ReEncrypt*', 'kms:GenerateDataKey*'],
            Resource: regionalKeyArn(masterKeyLogicalId, 'af-south-1'),
          },
          {
            Action: ['kms:Decrypt', 'kms:Encrypt', 'kms:ReEncrypt*', 'kms:GenerateDataKey*'],
            Resource: regionalKeyArn(masterKeyLogicalId, 'cn-north-1'),
          },
        ],
      },
    })
  })
  test('grantDecrypt', () => {
    const { replicatedKey, template, stack } = synth()
    const lambda = new cdk.aws_lambda.Function(stack, 'lambda', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      handler: 'lambda.handler',
      code: cdk.aws_lambda.Code.fromInline('export const handler = () => {}'),
    })
    replicatedKey.grantDecrypt(lambda)
    template().hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: 'kms:Decrypt',
            Resource: {
              'Fn::GetAtt': [masterKeyLogicalId, 'Arn'],
            },
          },
          {
            Action: 'kms:Decrypt',
            Resource: regionalKeyArn(masterKeyLogicalId, 'af-south-1'),
          },
          {
            Action: 'kms:Decrypt',
            Resource: regionalKeyArn(masterKeyLogicalId, 'cn-north-1'),
          },
        ],
      },
    })
  })
  test('grantEncrypt', () => {
    const { replicatedKey, template, stack } = synth()
    const lambda = new cdk.aws_lambda.Function(stack, 'lambda', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      handler: 'lambda.handler',
      code: cdk.aws_lambda.Code.fromInline('export const handler = () => {}'),
    })
    replicatedKey.grantEncrypt(lambda)
    template().hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: ['kms:Encrypt', 'kms:ReEncrypt*', 'kms:GenerateDataKey*'],
            Resource: {
              'Fn::GetAtt': [masterKeyLogicalId, 'Arn'],
            },
          },
          {
            Action: ['kms:Encrypt', 'kms:ReEncrypt*', 'kms:GenerateDataKey*'],
            Resource: regionalKeyArn(masterKeyLogicalId, 'af-south-1'),
          },
          {
            Action: ['kms:Encrypt', 'kms:ReEncrypt*', 'kms:GenerateDataKey*'],
            Resource: regionalKeyArn(masterKeyLogicalId, 'cn-north-1'),
          },
        ],
      },
    })
  })
})
