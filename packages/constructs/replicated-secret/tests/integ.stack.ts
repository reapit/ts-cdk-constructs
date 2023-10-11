import { ReplicatedKey } from '@reapit-cdk/replicated-key'
import { App, Stack } from '@reapit-cdk/integration-tests'
import { ReplicatedSecret } from '../dist'
import { CfnOutput } from 'aws-cdk-lib'

const app = new App()

const stack = new Stack(app, 'replicated-secret-test-stack')

const key = new ReplicatedKey(stack, 'replicated-key', {
  replicaRegions: ['eu-west-1', 'eu-west-2'],
})
const secret = new ReplicatedSecret(stack, 'certificate', {
  replicatedKey: key,
  replicaRegions: ['eu-west-1', 'eu-west-2'],
})

new CfnOutput(stack, 'output', {
  value: secret.secretArn,
})
