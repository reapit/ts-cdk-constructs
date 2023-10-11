import { App, Stack } from '@reapit-cdk/integration-tests'
import { UserPool } from 'aws-cdk-lib/aws-cognito'
import { UserPoolDomain } from '../dist'
import { CfnOutput } from 'aws-cdk-lib'

const app = new App()

const stack = new Stack(app, 'userpool-domain-test-stack')
const userPool = new UserPool(stack, 'userpool')

const userpoolDomain = new UserPoolDomain(stack, 'domain', {
  userPool,
})

new CfnOutput(stack, 'output', {
  value: userpoolDomain.domain,
})
new CfnOutput(stack, 'userpoolid', {
  value: userPool.userPoolId,
})
