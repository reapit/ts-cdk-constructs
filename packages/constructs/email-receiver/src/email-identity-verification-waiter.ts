import { Construct } from 'constructs'
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda'
import * as path from 'path'
import { Provider } from 'aws-cdk-lib/custom-resources'
import { CustomResource, Duration } from 'aws-cdk-lib'

interface VerificationWaiterProps {
  emailIdentityName: string
}

export class EmailIdentityVerificationWaiter extends Construct {
  dependable: CustomResource

  constructor(scope: Construct, id: string, props: VerificationWaiterProps) {
    super(scope, id)
    const lambda = new Function(this, 'lambda', {
      handler: 'verification-waiter.onEvent',
      runtime: Runtime.NODEJS_18_X,
      code: Code.fromAsset(path.join(__dirname, '..', 'dist', 'lambdas')),
      timeout: Duration.minutes(6),
    })

    const provider = new Provider(this, 'provider', {
      onEventHandler: lambda,
    })

    const cr = new CustomResource(this, 'resource', {
      serviceToken: provider.serviceToken,
      resourceType: 'Custom::EmailIdentityVerificationWaiter',
      properties: {
        emailIdentityName: props.emailIdentityName,
      },
    })

    this.dependable = cr
  }
}
