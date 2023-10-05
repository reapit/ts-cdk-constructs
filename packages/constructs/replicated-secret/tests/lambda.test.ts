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

  const successInNRequests = (n: number) => {
    const onDescribeSecretCommand = secretMock.on(DescribeSecretCommand)
    for (let i = 1; i < n; i++) {
      onDescribeSecretCommand.resolvesOnce({
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
    }
    onDescribeSecretCommand.resolves({
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
  }

  test('it should wait for all regions to be ready before returning', async () => {
    successInNRequests(3)

    await onEvent(genEvent())

    expect(secretMock).toHaveReceivedCommandTimes(DescribeSecretCommand, 3)
  })

  test('it should error after around 30 attempts', async () => {
    successInNRequests(32)

    const res = await onEvent(genEvent())

    expect(secretMock).toHaveReceivedCommandTimes(DescribeSecretCommand, 31)
    expect(res.Status).toBe('FAILED')
    expect(res.Reason?.split('\n')[0]).toBe(
      '[Error] Regions failed to propagate in time: Error: Regions failed to propagate in time',
    )
  })

  test('it should wait for all regions to be ready before returning when updating too', async () => {
    successInNRequests(3)

    await onEvent(genEvent('Update'))

    expect(secretMock).toHaveReceivedCommandTimes(DescribeSecretCommand, 3)
  })

  test('it should error if ReplicationStatus is not returned', async () => {
    secretMock.on(DescribeSecretCommand).resolvesOnce({})

    const res = await onEvent(genEvent())

    expect(secretMock).toHaveReceivedCommandTimes(DescribeSecretCommand, 1)
    expect(res.Status).toBe('FAILED')
    expect(res.Reason?.split('\n')[0]).toBe(
      '[Error] Waiting for replication regions but replicationstatus was undefined: Error: Waiting for replication regions but replicationstatus was undefined',
    )
  })

  test('it should bubble the error if any replica regions fail', async () => {
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
