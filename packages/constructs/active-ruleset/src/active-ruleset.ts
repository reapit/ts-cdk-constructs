import { CustomResource, Duration } from 'aws-cdk-lib'
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda'
import { Provider } from 'aws-cdk-lib/custom-resources'
import { Construct } from 'constructs'
import { PolicyStatement } from 'aws-cdk-lib/aws-iam'
import * as path from 'path'
import { ReceiptRuleSet, IReceiptRuleSet } from 'aws-cdk-lib/aws-ses'

export class ActiveRuleset extends Construct {
  receiptRuleSet: IReceiptRuleSet

  constructor(scope: Construct, id: string) {
    super(scope, id)

    const lambda = new Function(this, 'lambda', {
      handler: 'lambda.onEvent',
      timeout: Duration.seconds(60),
      runtime: Runtime.NODEJS_18_X,
      code: Code.fromAsset(path.join(__dirname, 'lambda')),
    })

    const provider = new Provider(this, 'provider', {
      onEventHandler: lambda,
    })

    const cr = new CustomResource(this, 'resource', {
      serviceToken: provider.serviceToken,
      properties: {
        test: 1,
      },
    })

    const name = cr.getAttString('ruleSetName')

    lambda.addToRolePolicy(
      new PolicyStatement({
        actions: [
          'ses:DescribeActiveReceiptRuleSet',
          'ses:CreateReceiptRuleSet',
          'ses:SetActiveReceiptRuleSet',
          'ses:DescribeReceiptRuleSet',
          'ses:DeleteReceiptRuleSet',
        ],
        resources: ['*'],
      }),
    )

    this.receiptRuleSet = ReceiptRuleSet.fromReceiptRuleSetName(this, 'ses-ruleset', name)
  }
}
