import { IntegTest, ExpectedResult, App } from '@reapit-cdk/integration-tests'
import { Stack } from 'aws-cdk-lib'

import { WildcardCertificate } from '../dist'

const app = new App()

const stack = new Stack(app, 'certificate-test-stack')

const parentDomain = process.env.INTEG_DOMAIN ?? 'integ.dev.paas.reapit.cloud'

const cert = new WildcardCertificate(stack, 'certificate', {
  domains: [`wildcard-test.${parentDomain}`],
})

const integ = new IntegTest(app, 'WildcardCertificateTest', {
  testCases: [stack],
  cdkCommandOptions: {
    destroy: {
      args: {
        force: true,
      },
    },
  },
  regions: [stack.region],
})

const assertion = integ.assertions
  .awsApiCall('acm', 'DescribeCertificate', {
    CertificateArn: cert.certificate.certificateArn,
  })
  .expect(
    ExpectedResult.objectLike({
      Certificate: {
        DomainName: `wildcard-test.${parentDomain}`,
        Status: 'ISSUED',
      },
    }),
  )

assertion.provider.addToRolePolicy({
  Effect: 'Allow',
  Action: ['acm:DescribeCertificate'],
  Resource: ['*'],
})
