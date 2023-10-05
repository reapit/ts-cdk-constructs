import { Stack, App } from 'aws-cdk-lib'
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda'
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
const lambda = new Function(stack, 'lambda', {
  runtime: Runtime.NODEJS_18_X,
  handler: 'lambda.handler',
  code: Code.fromInline('export const handler = () => {}'),
  environment: {
    usSecretArn: replicatedSecret.getRegionalSecret('us-east-1').secretArn,
    afSecretArn: replicatedSecret.getRegionalSecret('af-south-1').secretArn,
    cnSecretArn: replicatedSecret.getRegionalSecret('cn-north-1').secretArn,
  },
})
replicatedSecret.grantWrite(lambda)
