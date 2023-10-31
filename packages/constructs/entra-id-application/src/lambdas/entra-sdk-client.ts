import { Client } from '@microsoft/microsoft-graph-client'
import { getAccessToken } from './get-access-token'
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager'

const bootstrapClientSecretId = process.env.BOOTSTRAP_CLIENT_SECRET_ID

if (!bootstrapClientSecretId) {
  throw new Error('env var BOOTSTRAP_CLIENT_SECRET_ID missing')
}

type BootstrapClientInfo = {
  clientId: string
  clientSecret: string
  tenantId: string
}

const objectIsBootstrapClientInfo = (obj: any): obj is BootstrapClientInfo => {
  if (!obj.clientId || !obj.clientSecret || !obj.tenantId) {
    return false
  }
  return true
}

const getBootstrapClientInfo = async (): Promise<BootstrapClientInfo> => {
  const secretClient = new SecretsManagerClient()
  const secret = await secretClient.send(
    new GetSecretValueCommand({
      SecretId: bootstrapClientSecretId,
    }),
  )
  if (!secret.SecretString) {
    throw new Error('missing bootstrap secret string value')
  }
  const obj = JSON.parse(secret.SecretString)

  if (!objectIsBootstrapClientInfo(obj)) {
    throw new Error('invalid bootstrap secret json object, missing properties')
  }
  return obj
}

export const getBootstrapClientInfoPromise: Promise<BootstrapClientInfo> = getBootstrapClientInfo()

export const client = Client.initWithMiddleware({
  defaultVersion: 'v1.0',
  authProvider: {
    async getAccessToken(authenticationProviderOptions) {
      const bootstrapClientInfo = await getBootstrapClientInfoPromise
      return await getAccessToken({
        ...bootstrapClientInfo,
        scopes: authenticationProviderOptions?.scopes,
      })
    },
  },
})
