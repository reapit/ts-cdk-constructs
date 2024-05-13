import { IntegrationTest } from '@reapit-cdk/integration-tests'
import { CognitoIdentityProviderClient, DescribeUserPoolCommand } from '@aws-sdk/client-cognito-identity-provider'

import * as path from 'path'

describe('delete-custom-userpool-domain integration', () => {
  const stackFile = path.resolve(__dirname, './integ.stack.ts')

  const integ = new IntegrationTest({
    stackFile: stackFile,
    stackName: 'delete-custom-userpool-domain-test-stack',
  })

  integ.it('should', async () => {
    const client = new CognitoIdentityProviderClient({ region: 'us-east-1' })

    const result = await client.send(new DescribeUserPoolCommand({ UserPoolId: integ.outputs.userPoolId }))
    const { CustomDomain } = result.UserPool ?? {}

    expect(CustomDomain).toBeUndefined()
  })
})
