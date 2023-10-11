import { App, Stack } from '@reapit-cdk/integration-tests'
import { WildcardCertificate } from '../dist'
import { CfnOutput } from 'aws-cdk-lib'

const app = new App()

const stack = new Stack(app, 'certificate-test-stack')

const parentDomain = process.env.INTEG_DOMAIN ?? 'integ.dev.paas.reapit.cloud'

const cert = new WildcardCertificate(stack, 'certificate', {
  domains: [parentDomain],
})

new CfnOutput(stack, 'output', {
  value: cert.certificate.certificateArn,
})
