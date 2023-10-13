import {
  KeyState,
  DescribeKeyCommand,
  CancelKeyDeletionCommand,
  ReplicateKeyCommand,
  ScheduleKeyDeletionCommand,
  KMSClient,
} from '@aws-sdk/client-kms'
import { generateKeyPolicy } from '../generate-key-policy'
import { parseArn } from './utils'

const unDeleteKeyIfExists = async (keyId: string, region: string) => {
  console.log(region, keyId, 'checking if exists')
  const client = new KMSClient({ region })
  try {
    const res = await client.send(
      new DescribeKeyCommand({
        KeyId: keyId,
      }),
    )
    console.log(region, keyId, 'key already exists')
    if (res.KeyMetadata?.KeyState === KeyState.PendingDeletion) {
      console.log(region, keyId, 'cancelling key deletion')
      await client.send(
        new CancelKeyDeletionCommand({
          KeyId: keyId,
        }),
      )
      console.log(region, keyId, 'deletion cancellation request')
      await waitForReplicaKeyEnabled(keyId, region)
    }
    return true
  } catch (e) {
    console.log(region, keyId, 'key does not exist', e)
    return false
  }
}

const wait = (ms: number) => {
  if (process.env.TEST) {
    return
  }
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const waitForReplicaKeyEnabled = async (keyId: string, replicaRegion: string, iteration = 0): Promise<boolean> => {
  if (iteration > 100) {
    throw new Error(`Replica key ${keyId} in ${replicaRegion} did not become enabled in time.`)
  }
  const client = new KMSClient({ region: replicaRegion })
  const { KeyMetadata } = await client.send(
    new DescribeKeyCommand({
      KeyId: keyId,
    }),
  )
  if (!KeyMetadata) {
    throw new Error('no KeyMetadata returned from DescribeKey')
  }
  console.log(keyId, replicaRegion, 'is', KeyMetadata.KeyState)
  switch (KeyMetadata.KeyState) {
    case KeyState.Enabled:
      return true
    case KeyState.Creating:
    case KeyState.PendingImport:
    case KeyState.Updating:
      await wait(5000)
      return await waitForReplicaKeyEnabled(keyId, replicaRegion, iteration + 1)
    default:
      throw new Error(`Replica key ${keyId} in ${replicaRegion} in unhandled state: ${KeyMetadata.KeyState}`)
  }
}

export const replicateKey = async (keyArn: string, replicaRegion: string) => {
  const { region, keyId, account } = parseArn(keyArn)

  const exists = await unDeleteKeyIfExists(keyId, replicaRegion)
  if (exists) {
    return
  }

  console.log(replicaRegion, keyId, 'replicating key')
  const client = new KMSClient({ region })
  const { ReplicaKeyMetadata } = await client.send(
    new ReplicateKeyCommand({
      KeyId: keyId,
      ReplicaRegion: replicaRegion,
      Policy: JSON.stringify(generateKeyPolicy(account, replicaRegion)),
    }),
  )
  console.log(replicaRegion, keyId, 'replication requested', ReplicaKeyMetadata)
  await waitForReplicaKeyEnabled(keyId, replicaRegion)
  return ReplicaKeyMetadata
}

export const deleteKey = async (keyId: string, region: string) => {
  console.log(region, keyId, 'deleting key')
  const client = new KMSClient({ region })
  await client.send(
    new ScheduleKeyDeletionCommand({
      KeyId: keyId,
    }),
  )
  console.log(region, keyId, 'deleted')
}
