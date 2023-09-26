# @reapit-cdk/wildcard-certificate

This construct returns the given Cognito UserPool's UserPoolDomain, or creates one.
This resolves an issue with [AWS::Cognito::UserPoolDomain](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cognito-userpooldomain.html), since that will fail if one already exists.

## npm Package Installation:
```sh
yarn add --dev @reapit-cdk/wildcard-certificate
# or
npm install @reapit-cdk/wildcard-certificate --save-dev
```

## Usage
```ts
import { CfnOutput, Stack, App } from 'aws-cdk-lib'
import { UserPool } from 'aws-cdk-lib/aws-cognito'
import { UserPoolDomain } from '@reapit-cdk/wildcard-certificate'

const app = new App()
const stack = new Stack(app, 'stack-name')
const userPool = UserPool.fromUserPoolId(stack, 'userpool', userPoolId)
const userPoolDomain = new UserPoolDomain(stack, 'domain', { userPool })
new CfnOutput(stack, 'userPoolDomain', {
  value: userPoolDomain.domain,
})
```