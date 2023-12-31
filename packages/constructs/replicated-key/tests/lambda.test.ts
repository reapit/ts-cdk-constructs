import { mockClient } from 'aws-sdk-client-mock'
import 'aws-sdk-client-mock-jest'
import {
  CancelKeyDeletionCommand,
  DescribeKeyCommand,
  KMSClient,
  KeyState,
  MultiRegionKeyType,
  ReplicateKeyCommand,
  ScheduleKeyDeletionCommand,
} from '@aws-sdk/client-kms'
import { generateKeyPolicy } from '../src/generate-key-policy'
import { onEvent } from '../src/lambda/lambda'

const kmsMock = mockClient(KMSClient)

process.env.TEST = '1'

const genEvent = (RequestType: string = 'Create', props: Record<string, any> = {}): any => ({
  RequestType,
  LogicalResourceId: '1q23',
  RequestId: '1q23',
  ResourceProperties: {
    ServiceToken: 'asdf',
    keyArn: 'arn:aws:kms:us-east-1:account:key/key-id',
    regions: ['eu-west-2', 'us-east-2'],
    ...props,
  },
  OldResourceProperties: {},
  ResourceType: 'asdf',
  ResponseURL: 'asdf',
  ServiceToken: 'asdf',
  StackId: 'asdf',
})

describe('replicated-key', () => {
  beforeEach(() => {
    kmsMock.reset()
  })

  it('should replicate the given key to the given regions', async () => {
    kmsMock
      .on(DescribeKeyCommand)
      .resolvesOnce({
        KeyMetadata: {
          KeyId: 'key-id',
          MultiRegion: true,
          MultiRegionConfiguration: {
            MultiRegionKeyType: MultiRegionKeyType.PRIMARY,
            ReplicaKeys: [],
          },
        },
      })
      .rejectsOnce()
      .rejectsOnce()
      .resolves({
        KeyMetadata: {
          KeyId: 'key-id',
          MultiRegion: true,
          KeyState: 'Enabled',
          MultiRegionConfiguration: {
            MultiRegionKeyType: MultiRegionKeyType.PRIMARY,
            ReplicaKeys: [],
          },
        },
      })
    kmsMock.on(ScheduleKeyDeletionCommand).resolves({
      KeyId: 'key-id',
    })
    kmsMock.on(ReplicateKeyCommand).resolves({})
    kmsMock.on(CancelKeyDeletionCommand).resolves({
      KeyId: 'key-id',
    })

    await onEvent(genEvent())

    expect(kmsMock).toHaveReceivedCommandWith(ReplicateKeyCommand, {
      KeyId: 'key-id',
      ReplicaRegion: 'eu-west-2',
      Policy: JSON.stringify(generateKeyPolicy('account', 'eu-west-2')),
    })
    expect(kmsMock).toHaveReceivedCommandWith(ReplicateKeyCommand, {
      KeyId: 'key-id',
      ReplicaRegion: 'us-east-2',
      Policy: JSON.stringify(generateKeyPolicy('account', 'us-east-2')),
    })
    expect(kmsMock).not.toHaveReceivedCommand(CancelKeyDeletionCommand)
    expect(kmsMock).not.toHaveReceivedCommand(ScheduleKeyDeletionCommand)
  })

  it('should only replicate to regions that dont already contain a replica', async () => {
    kmsMock.on(DescribeKeyCommand).resolves({
      KeyMetadata: {
        KeyId: 'key-id',
        MultiRegion: true,
        MultiRegionConfiguration: {
          MultiRegionKeyType: MultiRegionKeyType.PRIMARY,
          ReplicaKeys: [],
        },
      },
    })
    kmsMock.on(ScheduleKeyDeletionCommand).resolves({
      KeyId: 'key-id',
    })
    kmsMock.on(ReplicateKeyCommand).resolves({})
    kmsMock.on(CancelKeyDeletionCommand).resolves({
      KeyId: 'key-id',
    })

    await onEvent(genEvent())
    expect(kmsMock).toHaveReceivedCommandTimes(DescribeKeyCommand, 3)
    expect(kmsMock).not.toHaveReceivedCommand(ReplicateKeyCommand)
    expect(kmsMock).not.toHaveReceivedCommand(CancelKeyDeletionCommand)
    expect(kmsMock).not.toHaveReceivedCommand(ScheduleKeyDeletionCommand)
  })

  it('should cancel key deletion if any replicas already exist and are pending deletion', async () => {
    kmsMock
      .on(DescribeKeyCommand)
      .resolvesOnce({
        KeyMetadata: {
          KeyId: 'key-id',
          MultiRegion: true,
          MultiRegionConfiguration: {
            MultiRegionKeyType: MultiRegionKeyType.PRIMARY,
            ReplicaKeys: [],
          },
        },
      })
      .resolvesOnce({
        KeyMetadata: {
          KeyId: 'key-id',
          KeyState: KeyState.PendingDeletion,
          MultiRegion: true,
          MultiRegionConfiguration: {
            MultiRegionKeyType: MultiRegionKeyType.REPLICA,
            ReplicaKeys: [],
          },
        },
      })
      .rejectsOnce()
      .resolves({
        KeyMetadata: {
          KeyId: 'key-id',
          MultiRegion: true,
          KeyState: KeyState.Enabled,
          MultiRegionConfiguration: {
            MultiRegionKeyType: MultiRegionKeyType.PRIMARY,
            ReplicaKeys: [],
          },
        },
      })
    kmsMock.on(ScheduleKeyDeletionCommand).resolves({
      KeyId: 'key-id',
    })
    kmsMock.on(ReplicateKeyCommand).resolves({})
    kmsMock.on(CancelKeyDeletionCommand).resolves({
      KeyId: 'key-id',
    })

    await onEvent(genEvent())
    expect(kmsMock).toHaveReceivedCommand(CancelKeyDeletionCommand)
    expect(kmsMock).toHaveReceivedCommand(ReplicateKeyCommand)
  })

  it('should update', async () => {
    kmsMock
      .on(DescribeKeyCommand)
      .resolvesOnce({
        KeyMetadata: {
          KeyId: 'key-id',
          MultiRegion: true,
          KeyState: KeyState.Enabled,
          MultiRegionConfiguration: {
            MultiRegionKeyType: MultiRegionKeyType.PRIMARY,
            ReplicaKeys: [
              {
                Arn: 'asdf',
                Region: 'eu-west-2',
              },
            ],
          },
        },
      })
      .resolvesOnce({
        KeyMetadata: {
          KeyId: 'key-id',
          MultiRegion: true,
          KeyState: KeyState.Enabled,
          MultiRegionConfiguration: {
            MultiRegionKeyType: MultiRegionKeyType.REPLICA,
            ReplicaKeys: [
              {
                Arn: 'asdf',
                Region: 'eu-west-2',
              },
            ],
          },
        },
      })
      .rejectsOnce()
      .resolves({
        KeyMetadata: {
          KeyId: 'key-id',
          MultiRegion: true,
          KeyState: KeyState.Enabled,
          MultiRegionConfiguration: {
            MultiRegionKeyType: MultiRegionKeyType.REPLICA,
            ReplicaKeys: [
              {
                Arn: 'asdf',
                Region: 'eu-west-2',
              },
            ],
          },
        },
      })
    kmsMock.on(ScheduleKeyDeletionCommand).resolves({
      KeyId: 'key-id',
    })
    kmsMock.on(ReplicateKeyCommand).resolves({})
    kmsMock.on(CancelKeyDeletionCommand).resolves({
      KeyId: 'key-id',
    })

    await onEvent(genEvent('Update'))
    expect(kmsMock).toHaveReceivedCommandWith(ReplicateKeyCommand, {
      KeyId: 'key-id',
      ReplicaRegion: 'us-east-2',
      Policy: JSON.stringify(generateKeyPolicy('account', 'us-east-2')),
    })
    expect(kmsMock).not.toHaveReceivedCommand(CancelKeyDeletionCommand)
    expect(kmsMock).not.toHaveReceivedCommand(ScheduleKeyDeletionCommand)

    expect(kmsMock).not.toHaveReceivedCommandWith(ReplicateKeyCommand, {
      KeyId: 'key-id',
      ReplicaRegion: 'eu-west-2',
      Policy: JSON.stringify(generateKeyPolicy('account', 'eu-west-2')),
    })
  })
  it('should delete', async () => {
    kmsMock.on(DescribeKeyCommand).resolvesOnce({
      KeyMetadata: {
        KeyId: 'key-id',
        MultiRegion: true,
        MultiRegionConfiguration: {
          MultiRegionKeyType: MultiRegionKeyType.PRIMARY,
          ReplicaKeys: [
            {
              Arn: '',
              Region: 'us-west-2',
            },
            {
              Arn: '',
              Region: 'eu-west-2',
            },
            {
              Arn: '',
              Region: 'cn-north-1',
            },
          ],
        },
      },
    })
    kmsMock.on(ScheduleKeyDeletionCommand).resolves({
      KeyId: 'key-id',
    })
    kmsMock.on(ReplicateKeyCommand).resolves({})
    kmsMock.on(CancelKeyDeletionCommand).resolves({
      KeyId: 'key-id',
    })

    await onEvent(
      genEvent('Delete', {
        keyArn: 'arn:aws:kms:us-east-1:account:key/key-id',
        regions: ['eu-west-2', 'us-west-2'],
      }),
    )

    expect(kmsMock).not.toHaveReceivedCommand(ReplicateKeyCommand)
    expect(kmsMock).not.toHaveReceivedCommand(CancelKeyDeletionCommand)
    expect(kmsMock).toHaveReceivedCommandTimes(ScheduleKeyDeletionCommand, 2)
  })

  it('should wait for the replica keys to be enabled after replication', async () => {
    kmsMock
      .on(DescribeKeyCommand)
      .resolvesOnce({
        KeyMetadata: {
          KeyId: 'key-id',
          MultiRegion: true,
          MultiRegionConfiguration: {
            MultiRegionKeyType: MultiRegionKeyType.PRIMARY,
            ReplicaKeys: [],
          },
        },
      })
      .rejectsOnce()
      .rejectsOnce()
      .resolvesOnce({
        KeyMetadata: {
          KeyId: 'key-id',
          MultiRegion: true,
          KeyState: KeyState.Creating,
          MultiRegionConfiguration: {
            MultiRegionKeyType: MultiRegionKeyType.REPLICA,
            ReplicaKeys: [],
          },
        },
      })
      .resolvesOnce({
        KeyMetadata: {
          KeyId: 'key-id',
          MultiRegion: true,
          KeyState: KeyState.Creating,
          MultiRegionConfiguration: {
            MultiRegionKeyType: MultiRegionKeyType.REPLICA,
            ReplicaKeys: [],
          },
        },
      })
      .resolvesOnce({
        KeyMetadata: {
          KeyId: 'key-id',
          MultiRegion: true,
          KeyState: KeyState.Creating,
          MultiRegionConfiguration: {
            MultiRegionKeyType: MultiRegionKeyType.REPLICA,
            ReplicaKeys: [],
          },
        },
      })
      .resolvesOnce({
        KeyMetadata: {
          KeyId: 'key-id',
          MultiRegion: true,
          KeyState: KeyState.PendingImport,
          MultiRegionConfiguration: {
            MultiRegionKeyType: MultiRegionKeyType.REPLICA,
            ReplicaKeys: [],
          },
        },
      })
      .resolvesOnce({
        KeyMetadata: {
          KeyId: 'key-id',
          MultiRegion: true,
          KeyState: KeyState.PendingImport,
          MultiRegionConfiguration: {
            MultiRegionKeyType: MultiRegionKeyType.REPLICA,
            ReplicaKeys: [],
          },
        },
      })
      .resolvesOnce({
        KeyMetadata: {
          KeyId: 'key-id',
          MultiRegion: true,
          KeyState: KeyState.PendingImport,
          MultiRegionConfiguration: {
            MultiRegionKeyType: MultiRegionKeyType.REPLICA,
            ReplicaKeys: [],
          },
        },
      })
      .resolves({
        KeyMetadata: {
          KeyId: 'key-id',
          MultiRegion: true,
          KeyState: KeyState.Enabled,
          MultiRegionConfiguration: {
            MultiRegionKeyType: MultiRegionKeyType.REPLICA,
            ReplicaKeys: [],
          },
        },
      })
    kmsMock.on(ScheduleKeyDeletionCommand).resolves({
      KeyId: 'key-id',
    })
    kmsMock.on(ReplicateKeyCommand).resolves({})
    kmsMock.on(CancelKeyDeletionCommand).resolves({
      KeyId: 'key-id',
    })

    await onEvent(genEvent())

    expect(kmsMock).toHaveReceivedCommandWith(ReplicateKeyCommand, {
      KeyId: 'key-id',
      ReplicaRegion: 'eu-west-2',
      Policy: JSON.stringify(generateKeyPolicy('account', 'eu-west-2')),
    })
    expect(kmsMock).toHaveReceivedCommandWith(ReplicateKeyCommand, {
      KeyId: 'key-id',
      ReplicaRegion: 'us-east-2',
      Policy: JSON.stringify(generateKeyPolicy('account', 'us-east-2')),
    })
    expect(kmsMock).toHaveReceivedCommandTimes(DescribeKeyCommand, 11)
    expect(kmsMock).not.toHaveReceivedCommand(CancelKeyDeletionCommand)
    expect(kmsMock).not.toHaveReceivedCommand(ScheduleKeyDeletionCommand)
  })
  it('should cope with being given a non-multiregion key', async () => {
    kmsMock.on(DescribeKeyCommand).resolvesOnce({
      KeyMetadata: {
        KeyId: 'key-id',
        MultiRegion: false,
      },
    })
    const res = await onEvent(genEvent())
    expect(res.Status).toBe('FAILED')
    expect(res.Reason?.split('\n')[0].includes('given key is not multiregion'))
  })
  it('should cope with being given a replica key', async () => {
    kmsMock.on(DescribeKeyCommand).resolvesOnce({
      KeyMetadata: {
        KeyId: 'key-id',
        MultiRegion: true,
        MultiRegionConfiguration: {
          MultiRegionKeyType: 'REPLICA',
        },
      },
    })
    const res = await onEvent(genEvent())
    expect(res.Status).toBe('FAILED')
    expect(res.Reason?.split('\n')[0].includes('given key is not multiregion primary key'))
  })
  it('should cope with being given a multiregion key with no MultiRegionConfiguration', async () => {
    kmsMock.on(DescribeKeyCommand).resolvesOnce({
      KeyMetadata: {
        KeyId: 'key-id',
        MultiRegion: true,
      },
    })
    const res = await onEvent(genEvent())
    expect(res.Status).toBe('FAILED')
    expect(res.Reason?.split('\n')[0].includes('given key is multiregion but no multiregion configuration was found'))
  })
})
