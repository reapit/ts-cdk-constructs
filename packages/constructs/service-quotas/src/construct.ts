import { Construct } from 'constructs'
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda'
import * as path from 'path'
import { CustomResource, Duration, Lazy } from 'aws-cdk-lib'
import { PolicyStatement } from 'aws-cdk-lib/aws-iam'
import { Provider } from 'aws-cdk-lib/custom-resources'
import { Config, Quota } from './types'

import { AWSService, ServiceQuotaMap } from './quotas'

export class ServiceQuotas extends Construct {
  private quotas: Quota[] = []
  config: Config

  constructor(scope: Construct, id: string, config: Config) {
    super(scope, id)

    this.config = config

    const lambda = new Function(this, 'lambda', {
      code: Code.fromAsset(path.join(__dirname, '..', 'dist', 'lambda')),
      handler: 'lambda.onEvent',
      runtime: Runtime.NODEJS_18_X,
      timeout: Duration.minutes(15),
    })

    lambda.addToRolePolicy(
      new PolicyStatement({
        actions: [
          'servicequotas:ListRequestedServiceQuotaChangeHistoryByQuota',
          'servicequotas:GetServiceQuota',
          'servicequotas:RequestServiceQuotaIncrease',
        ],
        resources: ['*'],
      }),
    )

    const provider = new Provider(this, 'provider', {
      onEventHandler: lambda,
    })

    const self = this

    new CustomResource(this, 'custom-resource', {
      serviceToken: provider.serviceToken,
      properties: {
        config: this.config,
        quotas: Lazy.any({
          produce() {
            return self.quotas
          },
        }),
      },
    })
  }

  requestQuota<S extends AWSService, Q extends ServiceQuotaMap[S]>(
    region: string,
    service: S,
    quota: Q,
    desiredValue: number,
  ) {
    this.quotas.push({
      desiredValue,
      quota: quota as string,
      region,
      service,
    })
  }
}
