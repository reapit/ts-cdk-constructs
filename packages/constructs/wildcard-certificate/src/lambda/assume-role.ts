import { randomUUID } from 'crypto'
import { STSClient, AssumeRoleCommand, STSClientConfigType } from '@aws-sdk/client-sts'

export const assumeRole = async ({ roleArn }: { roleArn: string }): Promise<STSClientConfigType['credentials']> => {
  const client = new STSClient({})
  const res = await client.send(
    new AssumeRoleCommand({
      RoleArn: roleArn,
      RoleSessionName: randomUUID(),
    }),
  )
  if (!res.Credentials) {
    throw new Error(`failed to assumed role ${roleArn}`)
  }
  const { AccessKeyId, Expiration, SecretAccessKey, SessionToken } = res.Credentials
  if (!AccessKeyId || !SecretAccessKey) {
    throw new Error('invalid credentials returned from assumerole call')
  }
  return {
    accessKeyId: AccessKeyId,
    secretAccessKey: SecretAccessKey,
    expiration: Expiration,
    sessionToken: SessionToken,
  }
}
