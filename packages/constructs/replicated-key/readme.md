# @reapit-cdk/replicated-key
Creates a KMS key and replicates it to the desired regions. Useful when replicating secrets across regions.

## npm Package Installation:
```sh
yarn add --dev @reapit-cdk/replicated-key
# or
npm install @reapit-cdk/replicated-key --save-dev
```

## Usage
```ts
import { CfnOutput, Stack, App } from 'aws-cdk-lib'
import { UserPool } from 'aws-cdk-lib/aws-cognito'
import { ReplicatedKey } from '@reapit-cdk/replicated-key'

const app = new App()
const stack = new Stack(app, 'stack-name', {
  env: {
    region: 'us-east-1', // region must be specified
  },
})
const key = new ReplicatedKey(stack, 'key', {
  replicaRegions: ['af-south-1', 'cn-north-1'],
})
const lambda = new cdk.aws_lambda.Function(stack, 'lambda', {
  runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
  handler: 'lambda.handler',
  code: cdk.aws_lambda.Code.fromInline('export const handler = () => {}'),
  environment: {
    usKeyArn: key.getRegionalKey('us-east-1').keyArn,
    afKeyArn: key.getRegionalKey('af-south-1').keyArn,
    cnKeyArn: key.getRegionalKey('cn-north-1').keyArn,
  },
})
key.grantEncryptDecrypt(lambda)
```