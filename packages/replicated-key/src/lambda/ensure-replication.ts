import { AWSRegion, stringIsAWSRegion } from '@reapit-cdk/common'
import {
  KMSClient,
  DescribeKeyCommand,
  MultiRegionKeyType as MultiRegionKeyTypeType,
  KeyMetadata,
} from '@aws-sdk/client-kms'
import { deleteKey, replicateKey } from './key'
import { strIsDefined, parseArn } from './utils'

const validateKeyMetadata = (keyMetadata?: KeyMetadata): AWSRegion[] => {
  if (!keyMetadata) {
    throw new Error('key metadata undefined')
  }
  const { MultiRegion, MultiRegionConfiguration } = keyMetadata
  if (!MultiRegion) {
    throw new Error('given key is not multiregion')
  }
  if (MultiRegionConfiguration) {
    const { MultiRegionKeyType, ReplicaKeys } = MultiRegionConfiguration
    if (MultiRegionKeyType !== MultiRegionKeyTypeType.PRIMARY) {
      throw new Error('given key is not multiregion primary key')
    }
    if (ReplicaKeys) {
      const existingRegions = ReplicaKeys.map((key) => key.Region)
        .filter(strIsDefined)
        .filter(stringIsAWSRegion)
      return existingRegions as AWSRegion[] // :(
    }
  }
  throw new Error('given key is multiregion but no multiregion configuration was found')
}

export const ensureReplication = async (keyArn: string, regions: AWSRegion[]) => {
  const { region, keyId } = parseArn(keyArn)
  const client = new KMSClient({
    region,
  })
  console.log(region, keyId, 'ensuring replication')
  const res = await client.send(
    new DescribeKeyCommand({
      KeyId: keyId,
    }),
  )

  const existingRegions = validateKeyMetadata(res.KeyMetadata)
  console.log(region, keyId, 'exists in regions', existingRegions)

  const regionsToDelete = existingRegions.filter((region) => !regions.includes(region))
  const regionsToReplicate = regions.filter((region) => !regionsToDelete.includes(region))

  console.log(region, keyId, 'deleting in regions', regionsToDelete)
  console.log(region, keyId, 'ensuring replication in regions', regionsToReplicate)

  await Promise.all(regionsToDelete.map((region) => deleteKey(keyId, region)))
  await Promise.all(regionsToReplicate.map((region) => replicateKey(keyArn, region)))
}

export const deleteReplicas = async (keyArn: string, regions: AWSRegion[]) => {
  const { region, keyId } = parseArn(keyArn)
  const client = new KMSClient({
    region,
  })
  console.log(region, keyId, 'deleting replicas')
  const res = await client.send(
    new DescribeKeyCommand({
      KeyId: keyId,
    }),
  )
  const existingRegions = validateKeyMetadata(res.KeyMetadata)
  const regionsToDelete = existingRegions.filter((region) => regions.includes(region))
  console.log(region, keyId, 'deleting in regions', regionsToDelete)
  const notDeletingRegions = existingRegions.filter((region) => !regions.includes(region))
  if (notDeletingRegions.length) {
    console.log(region, keyId, 'not deleting in regions not we originally didnt replicate to', notDeletingRegions)
  }
  await Promise.all(regionsToDelete.map((region) => deleteKey(keyId, region)))
}
