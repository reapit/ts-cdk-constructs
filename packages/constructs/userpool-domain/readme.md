# @reapit-cdk/userpool-domain


![npm version](https://img.shields.io/npm/v/@reapit-cdk/userpool-domain) ![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/userpool-domain) ![coverage: 99.02%25](https://img.shields.io/badge/coverage-99.02%25-green) ![Integ Tests: X](https://img.shields.io/badge/Integ Tests-X-red)

This construct returns the given Cognito UserPool's UserPoolDomain, or creates one. This resolves an issue with [AWS::Cognito::UserPoolDomain](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cognito-userpooldomain.html), since that will fail if one already exists.

## Package Installation:

```sh
yarn add --dev @reapit-cdk/userpool-domain
# or
npm install @reapit-cdk/userpool-domain --save-dev
```

## Usage
```ts
import { CfnOutput, Stack, App } from 'aws-cdk-lib'
import { UserPool } from 'aws-cdk-lib/aws-cognito'
import { UserPoolDomain } from '@reapit-cdk/userpool-domain'

const app = new App()
const stack = new Stack(app, 'stack-name')
const userPool = UserPool.fromUserPoolId(stack, 'userpool', 'USERPOOL_ID')
const userPoolDomain = new UserPoolDomain(stack, 'domain', { userPool })
new CfnOutput(stack, 'userPoolDomain', {
  value: userPoolDomain.domain,
})

```