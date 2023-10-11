import { IntegrationTest } from '@reapit-cdk/integration-tests'

import * as path from 'path'
import { sendTestEmail, waitForTestEmail } from './email'

describe('email-receiver integration', () => {
  const integ = new IntegrationTest({
    stackFile: path.resolve(__dirname, './integ.stack.ts'),
    stackName: 'email-receiver-test-stack',
  })

  void integ.it('should output the active receiptRuleSetName', async () => {
    const { recipient } = await sendTestEmail()
    const email = await waitForTestEmail(integ.outputs.output, recipient)
    expect(email).toBeDefined()
  })
})
