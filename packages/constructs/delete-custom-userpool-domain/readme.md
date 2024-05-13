# @reapit-cdk/delete-custom-userpool-domain


![npm version](https://img.shields.io/npm/v/@reapit-cdk/delete-custom-userpool-domain)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/delete-custom-userpool-domain)
![coverage: 99.02%25](https://img.shields.io/badge/coverage-99.02%25-green)
![Integ Tests: ✔](https://img.shields.io/badge/Integ%20Tests-%E2%9C%94-green)

This construct removes the custom domain configured for a Amazon Cognito hosted UI and auth API endpoints.

## Package Installation:

```sh
yarn add --dev @reapit-cdk/delete-custom-userpool-domain
# or
npm install @reapit-cdk/delete-custom-userpool-domain --save-dev
```

## Usage
```ts
import { Stack, App } from 'aws-cdk-lib'
import { UserPool } from 'aws-cdk-lib/aws-cognito'
import { DeleteCustomUserPoolDomain } from '@reapit-cdk/delete-custom-userpool-domain'

const app = new App()
const stack = new Stack(app, 'stack-name')
const userPool = UserPool.fromUserPoolId(stack, 'userpool', 'USERPOOL_ID')
new DeleteCustomUserPoolDomain(stack, 'domain', { userPool })

```