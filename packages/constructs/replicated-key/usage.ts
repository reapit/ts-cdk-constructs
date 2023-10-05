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
