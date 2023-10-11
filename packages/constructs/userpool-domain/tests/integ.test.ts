import { IntegrationTest } from '@reapit-cdk/integration-tests'
import { CognitoIdentityProviderClient, DescribeUserPoolCommand } from '@aws-sdk/client-cognito-identity-provider'

import * as path from 'path'

describe('userpool-domain integration', () => {
  const integ = new IntegrationTest({
    stackFile: path.resolve(__dirname, './integ.stack.ts'),
    stackName: 'userpool-domain-test-stack',
  })

  void integ.it('should return the domain', async () => {
    const client = new CognitoIdentityProviderClient()
    const domain = integ.outputs.output
    const result = await client.send(
      new DescribeUserPoolCommand({
        UserPoolId: integ.outputs.userpoolid,
      }),
    )
    expect(result.UserPool?.Domain).toBe(domain)
  })
})
