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
