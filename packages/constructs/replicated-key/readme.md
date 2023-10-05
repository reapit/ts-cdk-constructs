# @reapit-cdk/replicated-key


![npm version](https://img.shields.io/npm/v/@reapit-cdk/replicated-key)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/replicated-key)
![coverage: 99.02%](https://img.shields.io/badge/coverage-99.02%-green)
![Integ Tests: X](https://img.shields.io/badge/Integ%20Tests-X-red)

Creates a KMS key and replicates it to the desired regions. Useful when replicating secrets across regions.

## Package Installation:

```sh
yarn add --dev @reapit-cdk/replicated-key
# or
npm install @reapit-cdk/replicated-key --save-dev
```

## Usage
```ts
import { Stack, App } from 'aws-cdk-lib'
import { ReplicatedKey } from '@reapit-cdk/replicated-key'
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda'

const app = new App()
const stack = new Stack(app, 'stack-name', {
  env: {
    region: 'us-east-1', // region must be specified
  },
})
const key = new ReplicatedKey(stack, 'key', {
  replicaRegions: ['af-south-1', 'cn-north-1'],
})

const lambda = new Function(stack, 'lambda', {
  runtime: Runtime.NODEJS_18_X,
  handler: 'lambda.handler',
  code: Code.fromInline('export const handler = () => {}'),
  environment: {
    usKeyArn: key.getRegionalKey('us-east-1').keyArn,
    afKeyArn: key.getRegionalKey('af-south-1').keyArn,
    cnKeyArn: key.getRegionalKey('cn-north-1').keyArn,
  },
})

key.grantEncryptDecrypt(lambda)

```