import { CustomResource, Duration } from 'aws-cdk-lib'
import { IUserPool } from 'aws-cdk-lib/aws-cognito'
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda'
import { Provider } from 'aws-cdk-lib/custom-resources'
import { Construct } from 'constructs'
import * as path from 'path'

interface UserPoolDomainProps {
  userPool: IUserPool
}

export class UserPoolDomain extends Construct {
  provider: Provider
  domain: string

  constructor(scope: Construct, id: string, { userPool }: UserPoolDomainProps) {
    super(scope, id)
    const lambda = new Function(this, 'lambda', {
      handler: 'lambda.onEvent',
      timeout: Duration.seconds(60),
      runtime: Runtime.NODEJS_18_X,
      code: Code.fromAsset(path.join(__dirname, 'lambda')),
    })

    userPool.grant(lambda, 'cognito-idp:DescribeUserPool', 'cognito-idp:CreateUserPoolDomain')

    this.provider = new Provider(this, 'provider', {
      onEventHandler: lambda,
    })
    const { userPoolId } = userPool

    const res = new CustomResource(this, 'resource', {
      serviceToken: this.provider.serviceToken,
      properties: {
        userPoolId,
      },
    })
    this.domain = `https://${res.getAttString('domain')}.auth.${userPool.env.region}.amazoncognito.com`
  }
}
