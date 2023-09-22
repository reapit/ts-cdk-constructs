import {
  CognitoIdentityProviderClient,
  CreateUserPoolDomainCommand,
  DescribeUserPoolCommand,
} from '@aws-sdk/client-cognito-identity-provider'
import { randomUUID } from 'crypto'

const getUserPoolDomain = async (userPoolId: string) => {
  const [region] = userPoolId.split('_')
  const client = new CognitoIdentityProviderClient({
    region,
  })
  const userPool = await client.send(
    new DescribeUserPoolCommand({
      UserPoolId: userPoolId,
    }),
  )
  const { Domain, CustomDomain } = userPool.UserPool || {}
  if (!Domain || Domain === CustomDomain) {
    return undefined
  }
  return Domain
}

const createUserPoolDomain = async (userPoolId: string) => {
  const [region] = userPoolId.split('_')
  const client = new CognitoIdentityProviderClient({
    region,
  })

  const id = randomUUID()
  await client.send(
    new CreateUserPoolDomainCommand({
      Domain: id,
      UserPoolId: userPoolId,
    }),
  )

  return getUserPoolDomain(userPoolId)
}

export const ensureUserPoolDomain = async (userPoolId: string) => {
  const domain = await getUserPoolDomain(userPoolId)
  if (!domain) {
    return await createUserPoolDomain(userPoolId)
  }
  return domain
}
