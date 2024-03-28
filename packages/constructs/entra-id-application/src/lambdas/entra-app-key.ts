import { PasswordCredential, Application } from '@microsoft/microsoft-graph-types'
import { client } from './entra-sdk-client'
import { KeyInfo } from './types'

export const getEntraAppKey = async (appId: string, keyId: string) => {
  const app: Application = await client.api(`/applications(appId='${appId}')`).get()
  const key = app.passwordCredentials?.find((key) => key.keyId === keyId)
  return key
}

export const createEntraAppKey = async (appId: string, keyInfo: KeyInfo, validForMsStr: string) => {
  const validForMs = parseInt(validForMsStr, 10)
  if (Number.isNaN(validForMs)) {
    throw new Error(`Unable to parse validForMs tag value "${validForMsStr}", result was NaN`)
  }

  const endDateTime = new Date()
  endDateTime.setUTCMilliseconds(endDateTime.getUTCMilliseconds() + validForMs)
  const res = await client.api(`/applications(appId='${appId}')/addPassword`).post({
    passwordCredential: {
      ...keyInfo,
      endDateTime: endDateTime.toISOString(),
    },
  })

  return res as PasswordCredential
}

export const deleteEntraAppKey = async (appId: string, keyId: string) => {
  await client.api(`/applications(appId='${appId}')/removePassword`).post({
    keyId,
  })
}
