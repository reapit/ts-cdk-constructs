import { CfnOutput, Stack, App } from 'aws-cdk-lib'
import { WildcardCertificate } from '@reapit-cdk/wildcard-certificate'

const app = new App()
const stack = new Stack(app, 'stack-name', {
  // stack env is required if hostedZoneArn isn't specified
  env: {
    region: 'us-east-1',
    account: '000000',
  },
})

// simple example
const wildcardCertificate = new WildcardCertificate(stack, 'cert', {
  domains: ['example.org', 'example.com'],
})
new CfnOutput(stack, 'wildcardCertificateArn', {
  value: wildcardCertificate.certificate.certificateArn,
})

// cross-account example
const xAccountWildcardCertificate = new WildcardCertificate(stack, 'x-account-cert', {
  domains: [
    {
      domainName: 'example.org',
    },
    {
      domainName: 'example.com',
      hostedZoneArn: 'arn:partition:route53::account:hostedzone/Id',
      roleArn: 'arn:aws:iam::account:role/role-name-with-path',
    },
  ],
})
new CfnOutput(stack, 'xAccountWildcardCertificateArn', {
  value: xAccountWildcardCertificate.certificate.certificateArn,
})
