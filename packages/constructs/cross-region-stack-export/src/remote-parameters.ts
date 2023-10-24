import { Stack, CustomResource, aws_iam as iam, aws_logs as logs, custom_resources as cr, Duration } from 'aws-cdk-lib'
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda'
import { Construct } from 'constructs'
import * as path from 'path'

/**
 * Properties of the RemoteParameters
 */
export interface RemoteParametersProps {
  // /**
  //  * The remote CDK stack to get the parameters from.
  //  */
  // readonly stack: cdk.Stack;
  /**
   * The region code of the remote stack.
   */
  readonly region: string
  /**
   * The assumed role used to get remote parameters.
   */
  readonly role?: iam.IRole
  /**
   * The parameter path.
   */
  readonly path: string
  /**
   * Indicate whether always update the custom resource to get the new stack output
   * @default true
   */
  readonly alwaysUpdate?: boolean
}

/**
 * Represents the RemoteParameters of the remote CDK stack
 */
export class RemoteParameters extends Construct {
  /**
   * The parameters in the SSM parameter store for the remote stack.
   */
  readonly parameters: CustomResource

  constructor(scope: Construct, id: string, props: RemoteParametersProps) {
    super(scope, id)

    const onEvent = new Function(this, 'func', {
      handler: 'lambda.onEvent',
      timeout: Duration.seconds(60),
      runtime: Runtime.NODEJS_18_X,
      code: Code.fromAsset(path.join(__dirname, '..', 'dist', 'lambda')),
    })

    const myProvider = new cr.Provider(this, 'MyProvider', {
      onEventHandler: onEvent,
      logRetention: logs.RetentionDays.ONE_DAY,
    })

    onEvent.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ssm:GetParametersByPath'],
        resources: ['*'],
      }),
    )

    this.parameters = new CustomResource(this, 'SsmParameters', {
      serviceToken: myProvider.serviceToken,
      properties: {
        stackName: Stack.of(this).stackName,
        regionName: props.region,
        parameterPath: props.path,
        randomString: props.alwaysUpdate === false ? undefined : randomString(),
        role: props.role?.roleArn,
      },
    })

    if (props.role) {
      myProvider.onEventHandler.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ['sts:AssumeRole'],
          resources: [props.role.roleArn],
        }),
      )
    }
  }

  /**
   * Get the parameter.
   * @param key output key
   */
  public get(key: string) {
    return this.parameters.getAttString(key)
  }
}

function randomString() {
  // Crazy
  return Math.random()
    .toString(36)
    .replace(/[^a-z0-9]+/g, '')
}
