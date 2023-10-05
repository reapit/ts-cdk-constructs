# @reapit-cdk/wildcard-certificate


![npm version](https://img.shields.io/npm/v/@reapit-cdk/wildcard-certificate)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/wildcard-certificate)
![coverage: 97.89%](https://img.shields.io/badge/coverage-97.89%-green)
![Integ Tests: X](https://img.shields.io/badge/Integ%20Tests-X-red)

This construct returns a wildcard certificate valid for subdomains of the given domain names, creating and validating on if it doesn't exist. It supports cross-account DNS validation, you can pass in arns of roles from other accounts and it'll assume them whilst doing the Route53 updates.

## Package Installation:

```sh
yarn add --dev @reapit-cdk/wildcard-certificate
# or
npm install @reapit-cdk/wildcard-certificate --save-dev
```

## Usage
```ts
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

```