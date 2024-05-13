import { CustomResource, Duration } from 'aws-cdk-lib'
import { Provider } from 'aws-cdk-lib/custom-resources'
import { Construct } from 'constructs'
import { IUserPool } from 'aws-cdk-lib/aws-cognito'
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda'
import * as path from 'path'

export interface DeleteCustomUserPoolDomainProps {
  readonly userPool: IUserPool
}

export class DeleteCustomUserPoolDomain extends Construct {
  provider: Provider

  constructor(scope: Construct, id: string, { userPool }: DeleteCustomUserPoolDomainProps) {
    super(scope, id)

    const lambda = new Function(this, 'lambda', {
      handler: 'lambda.onEvent',
      timeout: Duration.seconds(60),
      runtime: Runtime.NODEJS_18_X,
      code: Code.fromAsset(path.join(__dirname, '..', 'dist', 'lambda')),
    })

    userPool.grant(lambda, 'cognito-idp:DescribeUserPool', 'cognito-idp:DeleteUserPoolDomain')

    this.provider = new Provider(this, 'provider', {
      onEventHandler: lambda,
    })

    const { userPoolId } = userPool
    new CustomResource(this, 'resource', {
      serviceToken: this.provider.serviceToken,
      properties: {
        userPoolId,
      },
    })
  }
}
