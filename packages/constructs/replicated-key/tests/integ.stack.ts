import { App, Stack } from '@reapit-cdk/integration-tests'
import { ReplicatedKey } from '../dist'
import { CfnOutput } from 'aws-cdk-lib'

const app = new App()

const stack = new Stack(app, 'replicated-key-test-stack')

const key = new ReplicatedKey(stack, 'replicated-key', {
  replicaRegions: ['eu-west-1', 'eu-west-2'],
})

new CfnOutput(stack, 'output', {
  value: key.getRegionalKey('eu-central-1').keyId,
})
