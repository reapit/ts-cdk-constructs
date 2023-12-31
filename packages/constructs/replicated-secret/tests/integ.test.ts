import { IntegrationTest } from '@reapit-cdk/integration-tests'
import { SecretsManagerClient, DescribeSecretCommand, StatusType } from '@aws-sdk/client-secrets-manager'

import * as path from 'path'

describe('replicated-secret integration', () => {
  const integ = new IntegrationTest({
    stackFile: path.resolve(__dirname, './integ.stack.ts'),
    stackName: 'replicated-secret-test-stack',
  })

  integ.it('should replicate the secret', async () => {
    const client = new SecretsManagerClient({
      region: 'eu-central-1',
    })
    const result = await client.send(
      new DescribeSecretCommand({
        SecretId: integ.outputs.output,
      }),
    )

    const replica1Status = result.ReplicationStatus?.find((status) => status.Region === 'eu-west-1')?.Status
    expect(replica1Status).toBe(StatusType.InSync)

    const replica2Status = result.ReplicationStatus?.find((status) => status.Region === 'eu-west-2')?.Status
    expect(replica2Status).toBe(StatusType.InSync)
  })
})
