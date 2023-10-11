import { IntegrationTest } from '@reapit-cdk/integration-tests'
import { KMSClient, DescribeKeyCommand, KeyState } from '@aws-sdk/client-kms'

import * as path from 'path'

const getKeyStatus = async (region: string, id: string) => {
  const client = new KMSClient({ region })
  const result = await client.send(
    new DescribeKeyCommand({
      KeyId: id,
    }),
  )

  return result.KeyMetadata?.KeyState
}

describe('replicated-key integration', () => {
  const integ = new IntegrationTest({
    stackFile: path.resolve(__dirname, './integ.stack.ts'),
    stackName: 'replicated-key-test-stack',
  })

  void integ.it('should replicate the key', async () => {
    const keyId = integ.outputs.output

    const masterKeyState = await getKeyStatus('eu-central-1', keyId)
    expect(masterKeyState).toBe(KeyState.Enabled)

    const replica1KeyState = await getKeyStatus('eu-west-1', keyId)
    expect(replica1KeyState).toBe(KeyState.Enabled)

    const replica2KeyState = await getKeyStatus('eu-west-2', keyId)
    expect(replica2KeyState).toBe(KeyState.Enabled)
  })
})
