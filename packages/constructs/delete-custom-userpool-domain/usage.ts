import { Stack, App } from 'aws-cdk-lib'
import { UserPool } from 'aws-cdk-lib/aws-cognito'
import { DeleteCustomUserPoolDomain } from '@reapit-cdk/delete-custom-userpool-domain'

const app = new App()
const stack = new Stack(app, 'stack-name')
const userPool = UserPool.fromUserPoolId(stack, 'userpool', 'USERPOOL_ID')
new DeleteCustomUserPoolDomain(stack, 'domain', { userPool })
