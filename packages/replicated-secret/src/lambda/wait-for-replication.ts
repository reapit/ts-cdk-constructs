import { SecretsManagerClient, DescribeSecretCommand, StatusType } from '@aws-sdk/client-secrets-manager'

const client = new SecretsManagerClient({})

const wait = (ms: number) => {
  if (!process.env.TEST) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export const waitForReplication = async (secretId: string, regions: string[], iteration: number = 0): Promise<void> => {
  const res = await client.send(
    new DescribeSecretCommand({
      SecretId: secretId,
    }),
  )

  if (!res.ReplicationStatus) {
    throw new Error('Waiting for replication regions but replicationstatus was undefined')
  }

  const weCareAbout = res.ReplicationStatus.filter(({ Region }) => Region && regions.includes(Region))

  const statusStr = weCareAbout
    .map(({ Region, Status, StatusMessage }) => `${Region}: ${Status}${StatusMessage ?? ''}`)
    .join(', ')
  console.log(`Replication status ${statusStr}`)

  const failed = weCareAbout.filter(({ Status }) => Status === StatusType.Failed)
  if (failed.length) {
    throw new Error(`Replication failed: ${statusStr}`)
  }

  const waitingFor = weCareAbout.filter(({ Status }) => Status === StatusType.InProgress)

  if (waitingFor.length) {
    if (iteration === 30) {
      throw new Error('Regions failed to propagate in time')
    }

    await wait(1000 * 10)
    return waitForReplication(secretId, regions, iteration + 1)
  }
}
