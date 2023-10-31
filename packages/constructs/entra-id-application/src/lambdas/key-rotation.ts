import { SecretsManagerRotationHandler } from 'aws-lambda'
import {
  SecretsManagerClient,
  DescribeSecretCommand,
  GetSecretValueCommand,
  ResourceNotFoundException,
  PutSecretValueCommand,
  UpdateSecretVersionStageCommand,
} from '@aws-sdk/client-secrets-manager'
import { createEntraAppKey, getEntraAppKey } from './entra-app-key'
import { getAccessToken } from './get-access-token'
import { getBootstrapClientInfoPromise } from './entra-sdk-client'

export const onEvent: SecretsManagerRotationHandler = async (event) => {
  const { SecretId, ClientRequestToken, Step } = event

  const client = new SecretsManagerClient({})
  const secret = await client.send(
    new DescribeSecretCommand({
      SecretId,
    }),
  )

  if (!secret.RotationEnabled) {
    throw new Error(`Secret "${SecretId}" not enabled for rotation`)
  }

  if (!secret.VersionIdsToStages?.[ClientRequestToken]) {
    throw new Error(`Secret "${SecretId}" has no stage "${ClientRequestToken}" for rotation of secret`)
  }

  const version = secret.VersionIdsToStages[ClientRequestToken]

  if (version.includes('AWSCURRENT')) {
    console.log(`Secret version "${ClientRequestToken}" already set as AWSCURRENT for secret "${SecretId}"`)
  }
  if (!version.includes('AWSPENDING')) {
    throw new Error(`Secret version "${ClientRequestToken}" not set as AWSPENDING for rotation of secret "${SecretId}"`)
  }

  switch (Step) {
    case 'createSecret':
      return createSecret(client, SecretId, ClientRequestToken)
    case 'setSecret':
      return setSecret(client, SecretId, ClientRequestToken)
    case 'testSecret':
      return testSecret(client, SecretId, ClientRequestToken)
    case 'finishSecret':
      return finishSecret(client, SecretId, ClientRequestToken)
    default:
      throw new Error(`Invalid step "${Step}"`)
  }
}

const rotateEntraKey = async (appId?: string, keyId?: string, validForMsStr?: string) => {
  if (!appId || !keyId || !validForMsStr) {
    throw new Error(`Required secret values, only found: ${JSON.stringify({ appId, keyId, validForMsStr })}`)
  }

  const existing = await getEntraAppKey(appId, keyId)
  if (!existing) {
    throw new Error('Existing key not found in Entra ID')
  }

  console.log(`Found key to rotate in Entra ID: "${existing.displayName}"`)

  const [origName, rotationNumStr] = existing.displayName?.split('- rotation ') ?? []
  const rotationNum = rotationNumStr ? parseInt(rotationNumStr, 10) : 0

  const newName = `${origName} - ${Number.isNaN(rotationNum) ? 1 : rotationNum + 1}`

  const newKey = await createEntraAppKey(
    appId,
    {
      displayName: newName,
    },
    validForMsStr,
  )

  return newKey
}

const createSecret = async (client: SecretsManagerClient, secretId: string, token: string) => {
  try {
    await client.send(
      new GetSecretValueCommand({
        SecretId: secretId,
        VersionId: token,
        VersionStage: 'AWSPENDING',
      }),
    )
  } catch (e) {
    if ((e as Error).name === ResourceNotFoundException.name) {
      await client.send(
        new PutSecretValueCommand({
          SecretId: secretId,
          ClientRequestToken: token,
          SecretString: await getNewSecretString(client, secretId),
          VersionStages: ['AWSPENDING'],
        }),
      )
    }
    throw e
  }
}

const getNewSecretString = async (client: SecretsManagerClient, secretId: string) => {
  const current = await client.send(
    new GetSecretValueCommand({
      SecretId: secretId,
      VersionStage: 'AWSCURRENT',
    }),
  )
  const { appId, keyId, validForMsStr } = JSON.parse(current.SecretString ?? '{}')

  const newKey = await rotateEntraKey(appId, keyId, validForMsStr)
  return JSON.stringify({
    appId,
    validForMsStr,
    secretText: newKey.secretText,
    keyId: newKey.keyId,
  })
}

const setSecret = async (client: SecretsManagerClient, secretId: string, token: string) => {
  await client.send(
    new PutSecretValueCommand({
      SecretId: secretId,
      ClientRequestToken: token,
      SecretString: await getNewSecretString(client, secretId),
      VersionStages: ['AWSPENDING'],
    }),
  )
}

const jwtDecode = (token: string) => {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
}

const testSecret = async (client: SecretsManagerClient, secretId: string, token: string) => {
  // test the pending secret version
  const version = await client.send(
    new GetSecretValueCommand({
      SecretId: secretId,
      VersionId: token,
      VersionStage: 'AWSPENDING',
    }),
  )
  const { tenantId } = await getBootstrapClientInfoPromise

  // see if this works
  const { secretText, appId } = JSON.parse(version.SecretString ?? '')
  if (!secretText) {
    throw new Error('secret is missing secretText')
  }
  if (!appId) {
    throw new Error('secret is missing appId')
  }
  const access_token = await getAccessToken({
    clientId: appId,
    clientSecret: secretText,
    tenantId,
  })
  if (!access_token) {
    throw new Error('no access token returned from /token call')
  }
  const { appid } = jwtDecode(access_token)
  if (!appid) {
    throw new Error('no appid in access token returned from /token call')
  }
  if (appid !== appId) {
    throw new Error(`appid in token "${appid}" does not match our appId "${appId}"`)
  }
}

const finishSecret = async (client: SecretsManagerClient, secretId: string, token: string) => {
  // mark the secret version passed in as the AWSCURRENT secret
  const secret = await client.send(
    new DescribeSecretCommand({
      SecretId: secretId,
    }),
  )

  const [currentVersion] =
    Object.entries(secret.VersionIdsToStages ?? {}).find(([, stages]) => {
      return stages.includes('AWSCURRENT')
    }) ?? []

  if (currentVersion === token) {
    console.log(`Version "${currentVersion}" already marked as AWSCURRENT for secret "${secretId}"`)
    return
  }

  await client.send(
    new UpdateSecretVersionStageCommand({
      SecretId: secretId,
      VersionStage: 'AWSCURRENT',
      MoveToVersionId: token,
      RemoveFromVersionId: currentVersion,
    }),
  )

  console.log(`Successfully set AWSCURRENT stage to version "${token}" for secret "${secretId}"`)
}
