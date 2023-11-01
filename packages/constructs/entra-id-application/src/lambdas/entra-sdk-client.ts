import { Client } from '@microsoft/microsoft-graph-client'
import { getAccessToken } from './get-access-token'
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager'
import { SecretObject } from './types'

const objectIsBootstrapClientInfo = (obj: any): obj is SecretObject => {
  if (!obj.validForMsStr || !obj.clientId || !obj.secretText || !obj.keyId || !obj.tenantId) {
    return false
  }
  return true
}

const getBootstrapClientInfo = async (): Promise<SecretObject> => {
  const bootstrapClientSecretId = process.env.BOOTSTRAP_CLIENT_SECRET_ID
  if (!bootstrapClientSecretId) {
    throw new Error('env var BOOTSTRAP_CLIENT_SECRET_ID missing')
  }
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

let getBootstrapClientInfoPromise: Promise<SecretObject>

export const client = Client.initWithMiddleware({
  defaultVersion: 'v1.0',
  authProvider: {
    async getAccessToken(authenticationProviderOptions) {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      if (!getBootstrapClientInfoPromise) {
        getBootstrapClientInfoPromise = getBootstrapClientInfo()
      }
      const bootstrapClientInfo = await getBootstrapClientInfoPromise
      return await getAccessToken({
        clientId: bootstrapClientInfo.clientId,
        clientSecret: bootstrapClientInfo.secretText,
        tenantId: bootstrapClientInfo.tenantId,
        scopes: authenticationProviderOptions?.scopes,
      })
    },
  },
})
