# @reapit-cdk/email-receiver
This construct sets up everything necessary to receive email. The emails get stored in a dynamodb table, queryable by recipient.

This is designed to be used in end-to-end tests, with the [@reapit-cdk/email-receiver-client](../../libs/email-receiver-client) helper library.

## npm Package Installation:
```sh
yarn add --dev @reapit-cdk/email-receiver
# or
npm install @reapit-cdk/email-receiver --save-dev
```

## Usage
```ts
import { CfnOutput, Stack, App } from 'aws-cdk-lib'
import { HostedZone } from 'aws-cdk-lib/aws-route53'
import { EmailReceiver } from '@reapit-cdk/email-receiver'

const app = new App()
const stack = new Stack(app, 'stack-name', {
  env: {
    region: 'us-east-1', // region must be specified
  },
})
const hostedZone = new HostedZone(stack, 'hostedZone', {
  zoneName: 'example.org',
})
const emailReceiver = new EmailReceiver(stack, 'domain', {
  hostedZone,
  // parentDomain: '', // you can optionally override the parent domain (e.g. your hosted zone is example.org but you want to use dev.example.org)
  // subdomain: '', // you can optionally override the subdomain, this defaults to 'email' so the resulting domain will be email.example.org
})
new CfnOutput(stack, 'emailReceiverDomainName', {
  value: emailReceiver.domainName,
})
new CfnOutput(stack, 'emailReceiverTableArn', {
  value: emailReceiver.table.tableArn,
})
```