# @reapit-cdk/wildcard-certificate
![npm version](https://img.shields.io/npm/v/@reapit-cdk/wildcard-certificate) ![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/wildcard-certificate) <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="114" height="20" role="img" aria-label="coverage: 97.89%"><title>coverage: 97.89%</title><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="114" height="20" rx="3" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="61" height="20" fill="#555"/><rect x="61" width="53" height="20" fill="#97ca00"/><rect width="114" height="20" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110"><text aria-hidden="true" x="315" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="510">coverage</text><text x="315" y="140" transform="scale(.1)" fill="#fff" textLength="510">coverage</text><text aria-hidden="true" x="865" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="430">97.89%</text><text x="865" y="140" transform="scale(.1)" fill="#fff" textLength="430">97.89%</text></g></svg> <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="90" height="20" role="img" aria-label="Integ Tests: X"><title>Integ Tests: X</title><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="90" height="20" rx="3" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="73" height="20" fill="#555"/><rect x="73" width="17" height="20" fill="#e05d44"/><rect width="90" height="20" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110"><text aria-hidden="true" x="375" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="630">Integ Tests</text><text x="375" y="140" transform="scale(.1)" fill="#fff" textLength="630">Integ Tests</text><text aria-hidden="true" x="805" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="70">X</text><text x="805" y="140" transform="scale(.1)" fill="#fff" textLength="70">X</text></g></svg>
This construct returns a wildcard certificate valid for subdomains of the given domain names, creating and validating on if it doesn't exist. It supports cross-account DNS validation, you can pass in arns of roles from other accounts and it'll assume them whilst doing the Route53 updates.
## Package Installation:
```sh
yarn add --dev undefined
# or
npm install undefined --save-dev
```
## Usage,```ts,import { CfnOutput, Stack, App } from 'aws-cdk-lib'
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
,```