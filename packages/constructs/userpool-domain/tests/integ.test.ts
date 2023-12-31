import { IntegrationTest } from '@reapit-cdk/integration-tests'
import { CognitoIdentityProviderClient, DescribeUserPoolCommand } from '@aws-sdk/client-cognito-identity-provider'

import * as path from 'path'

describe('userpool-domain integration', () => {
  const integ = new IntegrationTest({
    stackFile: path.resolve(__dirname, './integ.stack.ts'),
    stackName: 'userpool-domain-test-stack',
  })

  integ.it('should return the domain', async () => {
    const client = new CognitoIdentityProviderClient({
      region: 'eu-central-1',
    })
    const domain = integ.outputs.output
    const result = await client.send(
      new DescribeUserPoolCommand({
        UserPoolId: integ.outputs.userpoolid,
      }),
    )

    expect(`https://${result.UserPool?.Domain}.auth.eu-central-1.amazoncognito.com`).toBe(domain)
  })
})
