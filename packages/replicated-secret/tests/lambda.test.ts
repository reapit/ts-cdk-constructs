import {
  SecretsManagerClient,
  GetSecretValueCommand,
  PutSecretValueCommand,
  DescribeSecretCommand,
} from '@aws-sdk/client-secrets-manager'
import { mockClient } from 'aws-sdk-client-mock'
import 'aws-sdk-client-mock-jest'

import { onEvent } from '../src/lambda/lambda'

const secretMock = mockClient(SecretsManagerClient)
process.env.TEST = '1'

const genEvent = (RequestType: string = 'Create'): any => ({
  RequestType,
  LogicalResourceId: '1q23',
  RequestId: '1q23',
  ResourceProperties: {
    ServiceToken: 'asdf',
    secretArn: 'secret-arn',
    regions: ['eu-west-2', 'us-east-1'],
  },
  ResourceType: 'asdf',
  ResponseURL: 'asdf',
  ServiceToken: 'asdf',
  StackId: 'asdf',
})

describe('replicated-secret wait-for-replication', () => {
  beforeEach(() => {
    secretMock.reset()
  })

  test('it should wait for all regions to be ready before returning', async () => {
    secretMock
      .on(DescribeSecretCommand)
      .resolvesOnce({
        ReplicationStatus: [
          {
            Region: 'eu-west-2',
            Status: 'InProgress',
          },
          {
            Region: 'us-east-1',
            Status: 'InProgress',
          },
        ],
      })
      .resolvesOnce({
        ReplicationStatus: [
          {
            Region: 'eu-west-2',
            Status: 'InProgress',
          },
          {
            Region: 'us-east-1',
            Status: 'InProgress',
          },
        ],
      })
      .resolves({
        ReplicationStatus: [
          {
            Region: 'eu-west-2',
            Status: 'InSync',
          },
          {
            Region: 'us-east-1',
            Status: 'InSync',
          },
        ],
      })

    await onEvent(genEvent())

    expect(secretMock).toHaveReceivedCommandTimes(DescribeSecretCommand, 3)
  })

  test('it should wait for all regions to be ready before returning when updating too', async () => {
    secretMock
      .on(DescribeSecretCommand)
      .resolvesOnce({
        ReplicationStatus: [
          {
            Region: 'eu-west-2',
            Status: 'InProgress',
          },
          {
            Region: 'us-east-1',
            Status: 'InProgress',
          },
        ],
      })
      .resolvesOnce({
        ReplicationStatus: [
          {
            Region: 'eu-west-2',
            Status: 'InProgress',
          },
          {
            Region: 'us-east-1',
            Status: 'InProgress',
          },
        ],
      })
      .resolves({
        ReplicationStatus: [
          {
            Region: 'eu-west-2',
            Status: 'InSync',
          },
          {
            Region: 'us-east-1',
            Status: 'InSync',
          },
        ],
      })

    await onEvent(genEvent('Update'))

    expect(secretMock).toHaveReceivedCommandTimes(DescribeSecretCommand, 3)
  })

  test('it should bubble the error if any replica regions fail', async () => {
    secretMock
      .on(GetSecretValueCommand)
      .resolvesOnce({
        SecretString: undefined,
      })
      .resolvesOnce({
        SecretString: JSON.stringify({
          public: '',
          private: '',
          jwk: '',
        }),
      })

    secretMock
      .on(DescribeSecretCommand)
      .resolvesOnce({
        ReplicationStatus: [
          {
            Region: 'eu-west-2',
            Status: 'InProgress',
          },
          {
            Region: 'us-east-1',
            Status: 'InProgress',
          },
        ],
      })
      .resolvesOnce({
        ReplicationStatus: [
          {
            Region: 'eu-west-2',
            Status: 'InProgress',
          },
          {
            Region: 'us-east-1',
            Status: 'InProgress',
          },
        ],
      })
      .resolves({
        ReplicationStatus: [
          {
            Region: 'eu-west-2',
            Status: 'Failed',
            StatusMessage: 'AWS borked',
          },
          {
            Region: 'us-east-1',
            Status: 'Failed',
            StatusMessage: 'AWS broken',
          },
        ],
      })

    const result = await onEvent(genEvent())

    expect(result.Status).toBe('FAILED')
    console.log('REASON', result.Reason)
    expect(result.Reason?.split('\n')[0]).toBe(
      '[Error] Replication failed: eu-west-2: Failed AWS borked, us-east-1: Failed AWS broken: Error: Replication failed: eu-west-2: Failed AWS borked, us-east-1: Failed AWS broken',
    )

    expect(secretMock).toHaveReceivedCommandTimes(DescribeSecretCommand, 3)
    expect(secretMock).not.toHaveReceivedCommandWith(GetSecretValueCommand, {
      SecretId: 'secret-arn',
    })
    expect(secretMock).not.toHaveReceivedCommandWith(PutSecretValueCommand, {
      SecretId: 'secret-arn',
      SecretString: JSON.stringify({
        public: 'public-key',
        private: 'private-key',
        jwk: JSON.stringify('jwks'),
      }),
    })
  })

  test('it should only care about replica regions specified', async () => {
    secretMock
      .on(DescribeSecretCommand)
      .resolvesOnce({
        ReplicationStatus: [
          {
            Region: 'eu-west-2',
            Status: 'InProgress',
          },
          {
            Region: 'us-east-1',
            Status: 'InProgress',
          },
          {
            Region: 'us-west-2',
            Status: 'InProgress',
          },
        ],
      })
      .resolvesOnce({
        ReplicationStatus: [
          {
            Region: 'eu-west-2',
            Status: 'InProgress',
          },
          {
            Region: 'us-east-1',
            Status: 'InProgress',
          },
          {
            Region: 'us-west-2',
            Status: 'InProgress',
          },
        ],
      })
      .resolves({
        ReplicationStatus: [
          {
            Region: 'eu-west-2',
            Status: 'InSync',
          },
          {
            Region: 'us-east-1',
            Status: 'InSync',
          },
          {
            Region: 'us-west-2',
            Status: 'Failed',
            StatusMessage: 'AWS broken',
          },
        ],
      })

    await onEvent(genEvent())

    expect(secretMock).toHaveReceivedCommandTimes(DescribeSecretCommand, 3)
  })
})
