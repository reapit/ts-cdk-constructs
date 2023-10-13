import { Duration, Lazy } from 'aws-cdk-lib'
import { IDistribution } from 'aws-cdk-lib/aws-cloudfront'
import { Rule, RuleTargetInput } from 'aws-cdk-lib/aws-events'
import { SfnStateMachine } from 'aws-cdk-lib/aws-events-targets'
import { DefinitionBody, JsonPath, StateMachine } from 'aws-cdk-lib/aws-stepfunctions'
import { CallAwsService } from 'aws-cdk-lib/aws-stepfunctions-tasks'
import { Construct } from 'constructs'

export interface CloudfrontInvalidationProps {
  readonly distribution: IDistribution
  items?: string[]
  invalidateOnCreation?: boolean
}

export class CloudfrontInvalidation extends Construct {
  constructor(
    scope: Construct,
    id: string,
    { distribution, items = ['/index.html'], invalidateOnCreation }: CloudfrontInvalidationProps,
  ) {
    super(scope, id)

    const createInvalidation = new CallAwsService(this, 'CreateInvalidation', {
      service: 'cloudfront',
      action: 'createInvalidation',
      parameters: {
        DistributionId: distribution.distributionId,
        InvalidationBatch: {
          CallerReference: JsonPath.entirePayload,
          Paths: {
            Items: Lazy.list({
              produce() {
                return items
              },
            }),
            Quantity: Lazy.number({
              produce() {
                return items.length
              },
            }),
          },
        },
      },
      iamResources: [`arn:aws:cloudfront::${distribution.stack.account}:distribution/${distribution.distributionId}`],
    })

    const createInvalidationStateMachine = new StateMachine(this, 'CreateInvalidationStateMachine', {
      definitionBody: DefinitionBody.fromChainable(
        createInvalidation.addRetry({
          errors: ['CloudFront.CloudFrontException'],
          backoffRate: 2,
          interval: Duration.seconds(5),
          maxAttempts: 10,
        }),
      ),
    })

    const stateMachine = new SfnStateMachine(createInvalidationStateMachine, {
      input: RuleTargetInput.fromEventPath('$.id'),
    })

    new Rule(this, 'DeploymentComplete', {
      eventPattern: {
        source: ['aws.cloudformation'],
        detail: {
          'stack-id': [distribution.stack.stackId],
          'status-details': {
            status: ['UPDATE_COMPLETE'],
          },
        },
      },
    }).addTarget(stateMachine)

    if (invalidateOnCreation) {
      new Rule(this, 'DeploymentCreateComplete', {
        eventPattern: {
          source: ['aws.cloudformation'],
          detail: {
            'stack-id': [distribution.stack.stackId],
            'status-details': {
              status: ['CREATE_COMPLETE'],
            },
          },
        },
      }).addTarget(stateMachine)
    }
  }
}
