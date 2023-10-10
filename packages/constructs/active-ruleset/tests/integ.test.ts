import { IntegrationTest } from '@reapit-cdk/integration-tests'

import { DescribeActiveReceiptRuleSetCommand, SESClient } from '@aws-sdk/client-ses'
import * as path from 'path'

describe('active-rule integration', () => {
  const integ = new IntegrationTest({
    stackFile: path.resolve(__dirname, './integ.stack.ts'),
    stackName: 'active-ruleset-stack',
  })

  beforeAll(
    async () => {
      const runTests = await integ.setup()
      if (!runTests) {
        pending('Test skipped - snapshot unchanged')
      }
    },
    5 * 60 * 1000,
  )

  afterAll(
    async () => {
      await integ.teardown()
    },
    5 * 60 * 1000,
  )

  it('should output the active receiptRuleSetName', async () => {
    const ses = new SESClient({
      region: 'eu-central-1',
    })
    const result = await ses.send(new DescribeActiveReceiptRuleSetCommand({}))
    expect(result.Metadata?.Name).toBe(integ.outputs.output)
  })
})
