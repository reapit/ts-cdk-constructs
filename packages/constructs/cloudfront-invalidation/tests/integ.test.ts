import { IntegrationTest } from '@reapit-cdk/integration-tests'

import { ListInvalidationsCommand, CloudFrontClient } from '@aws-sdk/client-cloudfront'
import * as path from 'path'

describe('cloudfront-invalidation integration', () => {
  const integ = new IntegrationTest({
    stackFile: path.resolve(__dirname, './integ.stack.ts'),
    stackName: 'cloudfront-invalidation-stack',
  })

  integ.it('should output the active receiptRuleSetName', async () => {
    const client = new CloudFrontClient()
    const result = await client.send(
      new ListInvalidationsCommand({
        DistributionId: integ.outputs.output,
      }),
    )
    expect(result.InvalidationList?.Items?.length).toBeGreaterThanOrEqual(1)
  })
})
