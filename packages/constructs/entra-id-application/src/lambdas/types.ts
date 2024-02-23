import { PasswordCredential } from '@microsoft/microsoft-graph-types'

export type SecretObject = {
  validForMsStr: string
  clientId: string
  secretText: string
  keyId: string
  tenantId: string
}

export type KeyInfo = Omit<Omit<PasswordCredential, 'customKeyIdentifier'>, 'secretText'>
