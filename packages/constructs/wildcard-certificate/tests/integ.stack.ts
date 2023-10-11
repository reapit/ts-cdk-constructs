import { App, Stack } from '@reapit-cdk/integration-tests'
import { WildcardCertificate } from '../dist'
import { CfnOutput } from 'aws-cdk-lib'

const app = new App()

const stack = new Stack(app, 'certificate-test-stack')

const parentDomain = process.env.INTEG_DOMAIN ?? 'integ.dev.paas.reapit.cloud'
const hostedZoneId = process.env.INTEG_ZONE_ID

const cert = new WildcardCertificate(stack, 'certificate', {
  domains: [
    {
      domainName: parentDomain,
      hostedZoneArn: hostedZoneId && `arn:aws:route53:::/hostedzone/${hostedZoneId}`,
    },
  ],
})

new CfnOutput(stack, 'output', {
  value: cert.certificate.certificateArn,
})
