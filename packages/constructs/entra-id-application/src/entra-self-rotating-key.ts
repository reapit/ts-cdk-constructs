import { Duration } from 'aws-cdk-lib'
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager'
import { Construct } from 'constructs'
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda'
import * as path from 'path'

export interface EntraSelfRotatingKeyProps {
  secret: ISecret
}

export class EntraSelfRotatingKey extends Construct {
  constructor(scope: Construct, id: string, props: EntraSelfRotatingKeyProps) {
    super(scope, id)
    const { secret } = props

    const keyRotationLambda = new Function(this, 'key-rotation-lambda', {
      handler: 'key-rotation.onEvent',
      timeout: Duration.seconds(10),
      runtime: Runtime.NODEJS_18_X,
      code: Code.fromAsset(path.join(__dirname, '..', 'dist', 'lambdas')),
      environment: {
        BOOTSTRAP_CLIENT_SECRET_ID: secret.secretArn,
      },
    })
    secret.grantRead(keyRotationLambda)

    secret.addRotationSchedule('secret-rotation', {
      automaticallyAfter: Duration.days(7),
      rotationLambda: keyRotationLambda,
      rotateImmediatelyOnUpdate: true,
    })
  }
}
