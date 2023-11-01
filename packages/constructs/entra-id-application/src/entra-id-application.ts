import { CustomResource, Duration, SecretValue, RemovalPolicy } from 'aws-cdk-lib'
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda'
import { Provider } from 'aws-cdk-lib/custom-resources'
import { Application, PasswordCredential } from '@microsoft/microsoft-graph-types'
import { Construct } from 'constructs'
import * as path from 'path'
import { KeyInfo } from './lambdas/entra-app-key'
import { ISecret, Secret } from 'aws-cdk-lib/aws-secretsmanager'
import { SecretObject } from './lambdas/types'

export interface EntraIDApplicationProps {
  config: Application
  bootstrapClientSecret: ISecret
  removalPolicy?: RemovalPolicy
}

export interface CreateKeyProps {
  keyInfo: Omit<Omit<KeyInfo, 'endDateTime'>, 'startDateTime'>
  validFor: Duration
  removalPolicy?: RemovalPolicy
}

export class EntraIDApplication extends Construct {
  private app: CustomResource
  private keyProvider: Provider
  private keyRotationLambda: Function
  private bootstrapClientSecret: ISecret

  constructor(scope: Construct, id: string, props: EntraIDApplicationProps) {
    super(scope, id)

    const { bootstrapClientSecret } = props

    this.bootstrapClientSecret = bootstrapClientSecret

    const appLambda = new Function(this, 'app-lambda', {
      handler: 'application.onEvent',
      timeout: Duration.seconds(10),
      runtime: Runtime.NODEJS_18_X,
      code: Code.fromAsset(path.join(__dirname, '..', 'dist', 'lambdas')),
      environment: {
        BOOTSTRAP_CLIENT_SECRET_ID: bootstrapClientSecret.secretArn,
      },
    })

    bootstrapClientSecret.grantRead(appLambda)

    const appProvider = new Provider(this, 'app-provider', {
      onEventHandler: appLambda,
    })

    this.app = new CustomResource(this, 'resource', {
      serviceToken: appProvider.serviceToken,
      properties: props.config,
      removalPolicy: props.removalPolicy ?? RemovalPolicy.RETAIN,
    })

    const keyLambda = new Function(this, 'key-lambda', {
      handler: 'key.onEvent',
      timeout: Duration.seconds(10),
      runtime: Runtime.NODEJS_18_X,
      code: Code.fromAsset(path.join(__dirname, '..', 'dist', 'lambdas')),
      environment: {
        BOOTSTRAP_CLIENT_SECRET_ID: bootstrapClientSecret.secretArn,
      },
    })
    bootstrapClientSecret.grantRead(keyLambda)

    this.keyRotationLambda = new Function(this, 'key-rotation-lambda', {
      handler: 'key-rotation.onEvent',
      timeout: Duration.seconds(10),
      runtime: Runtime.NODEJS_18_X,
      code: Code.fromAsset(path.join(__dirname, '..', 'dist', 'lambdas')),
      environment: {
        BOOTSTRAP_CLIENT_SECRET_ID: bootstrapClientSecret.secretArn,
      },
    })
    bootstrapClientSecret.grantRead(this.keyRotationLambda)

    this.keyProvider = new Provider(this, 'key-provider', {
      onEventHandler: keyLambda,
    })
  }

  getAttString = (attr: keyof Application) => {
    return this.app.getAttString(attr)
  }

  createKey(
    scope: Construct,
    id: string,
    props: CreateKeyProps,
  ): Omit<PasswordCredential, 'secretText'> & { secret: Secret } {
    if (props.validFor.toMilliseconds() < Duration.days(7).toMilliseconds()) {
      throw new Error('Key must be valid for more than 7 days.')
    }

    if (props.validFor.toMilliseconds() > Duration.days(365 * 2).toMilliseconds()) {
      throw new Error('Key must be valid for less than 2 years.')
    }

    const key = new CustomResource(scope, id, {
      serviceToken: this.keyProvider.serviceToken,
      properties: {
        appId: this.getAttString('appId'),
        validForMsStr: props.validFor.toMilliseconds().toString(),
        ...props.keyInfo,
      },
      removalPolicy: RemovalPolicy.RETAIN || props.removalPolicy,
    })

    const getAttString = (attr: keyof PasswordCredential) => {
      return key.getAttString(attr)
    }

    type InitialSecretValue = Record<keyof SecretObject, SecretValue>

    const secretObjectValue: InitialSecretValue = {
      secretText: SecretValue.resourceAttribute(key.getAttString('secretText')),
      clientId: SecretValue.resourceAttribute(this.getAttString('appId')),
      keyId: SecretValue.resourceAttribute(getAttString('keyId')),
      validForMsStr: SecretValue.unsafePlainText(props.validFor.toMilliseconds().toString()),
      tenantId: SecretValue.secretsManager(this.bootstrapClientSecret.secretArn, {
        jsonField: 'tenantId',
      }),
    }
    const secret = new Secret(scope, `${id}-secret`, {
      secretObjectValue,
    })

    secret.addRotationSchedule(`${id}-secret-rotation`, {
      automaticallyAfter: props.validFor.minus(Duration.days(7)),
      rotationLambda: this.keyRotationLambda,
      rotateImmediatelyOnUpdate: false,
    })

    return {
      displayName: getAttString('displayName'),
      startDateTime: getAttString('startDateTime'),
      keyId: getAttString('keyId'),
      endDateTime: getAttString('endDateTime'),
      hint: getAttString('hint'),
      secret,
    }
  }
}
