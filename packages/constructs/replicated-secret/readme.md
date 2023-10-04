# @reapit-cdk/replicated-secret
Creates a Secret and replicates it across the given regions. Requires a [ReplicatedKey](../replicated-key/readme.md) be passed in.



## npm Package Installation:
```sh
yarn add --dev @reapit-cdk/replicated-secret
# or
npm install @reapit-cdk/replicated-secret --save-dev
```

## Usage
```ts
import { CfnOutput, Stack, App } from 'aws-cdk-lib'
import { UserPool } from 'aws-cdk-lib/aws-cognito'
import { ReplicatedKey } from '@reapit-cdk/replicated-key'
import { ReplicatedSecret } from '@reapit-cdk/replicated-secret'

const app = new App()
const stack = new Stack(app, 'stack-name', {
  env: {
    region: 'us-east-1', // region must be specified
  },
})
const replicatedKey = new ReplicatedKey(stack, 'key', {
  replicaRegions: ['af-south-1', 'cn-north-1'],
})
const replicatedSecret = new ReplicatedSecret(stack, 'secret', {
  replicaRegions: ['af-south-1', 'cn-north-1'],
  replicatedKey,
})
const lambda = new cdk.aws_lambda.Function(stack, 'lambda', {
  runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
  handler: 'lambda.handler',
  code: cdk.aws_lambda.Code.fromInline('export const handler = () => {}'),
  environment: {
    usSecretArn: replicatedSecret.getRegionalSecret('us-east-1').secretArn,
    afSecretArn: replicatedSecret.getRegionalSecret('af-south-1').secretArn,
    cnSecretArn: replicatedSecret.getRegionalSecret('cn-north-1').secretArn,
  },
})
replicatedSecret.grantWrite(lambda)
```