import { IntegrationTest } from '@reapit-cdk/integration-tests'

import { ACMClient, CertificateStatus, DescribeCertificateCommand } from '@aws-sdk/client-acm'
import * as path from 'path'

describe('wildcard-certificate integration', () => {
  const integ = new IntegrationTest({
    stackFile: path.resolve(__dirname, './integ.stack.ts'),
    stackName: 'certificate-test-stack',
  })

  void integ.it('should create the wildcard certificate', async () => {
    const parentDomain = process.env.INTEG_DOMAIN ?? 'integ.dev.paas.reapit.cloud'
    const client = new ACMClient({
      region: 'eu-central-1',
    })
    const result = await client.send(
      new DescribeCertificateCommand({
        CertificateArn: integ.outputs.output,
      }),
    )
    expect(result.Certificate?.DomainName).toBe(`wildcard-test.${parentDomain}`)
    expect(result.Certificate?.Status).toBe(CertificateStatus.ISSUED)
  })
})
