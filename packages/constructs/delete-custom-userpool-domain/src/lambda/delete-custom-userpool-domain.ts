import {
  CognitoIdentityProviderClient,
  DeleteUserPoolDomainCommand,
  DescribeUserPoolCommand,
} from '@aws-sdk/client-cognito-identity-provider'

export const deleteCustomUserPoolDomain = async (userPoolId: string) => {
  const [region] = userPoolId.split('_')
  const client = new CognitoIdentityProviderClient({
    region,
  })

  const userPool = await client.send(
    new DescribeUserPoolCommand({
      UserPoolId: userPoolId,
    }),
  )

  const { CustomDomain } = userPool.UserPool || {}

  if (CustomDomain) {
    // Delete the custom domain if found
    await client.send(
      new DeleteUserPoolDomainCommand({
        UserPoolId: userPoolId,
        Domain: CustomDomain,
      }),
    )
  }
}
