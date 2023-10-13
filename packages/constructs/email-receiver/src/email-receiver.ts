import { EmailIdentity, Identity } from 'aws-cdk-lib/aws-ses'
import * as actions from 'aws-cdk-lib/aws-ses-actions'
import { Construct, DependencyGroup } from 'constructs'
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb'
import { CfnRecordSet, IHostedZone, MxRecord } from 'aws-cdk-lib/aws-route53'
import { Topic } from 'aws-cdk-lib/aws-sns'
import { LambdaSubscription } from 'aws-cdk-lib/aws-sns-subscriptions'
import { ActiveRuleset } from '@reapit-cdk/active-ruleset'
import { EmailEncoding } from 'aws-cdk-lib/aws-ses-actions'
import { Lazy, Stack, Token } from 'aws-cdk-lib'
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda'
import * as path from 'path'
import { EmailIdentityVerificationWaiter } from './email-identity-verification-waiter'

export class EmailReceiver extends Construct {
  table: Table
  domainName: string

  constructor(
    scope: Construct,
    id: string,
    props: { parentDomain?: string; subdomain?: string; hostedZone: IHostedZone },
  ) {
    super(scope, id)
    const domain = (props.subdomain ?? 'email') + '.' + (props.parentDomain ?? props.hostedZone.zoneName)
    this.domainName = domain

    if (Token.isUnresolved(Stack.of(this).region)) {
      throw new Error('stack region unresolved, please be explicit')
    }

    this.table = new Table(this, 'table', {
      partitionKey: {
        name: 'recipient',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
    })

    const topic = new Topic(this, 'topic')

    const verification = new EmailIdentity(this, 'Identity', {
      identity: Identity.domain(domain),
    })

    const records = new DependencyGroup()
    verification.dkimRecords.forEach((record, idx) => {
      const recordSet = new CfnRecordSet(this, `dkim-${idx}`, {
        hostedZoneId: props.hostedZone.hostedZoneId,
        type: 'CNAME',
        name: Lazy.string({ produce: () => record.name }),
        resourceRecords: [Lazy.string({ produce: () => record.value })],
        ttl: '1800',
      })
      records.add(recordSet)
    })

    records.add(
      new MxRecord(this, 'mx-record', {
        values: [
          {
            hostName: `inbound-smtp.${Stack.of(this).region}.amazonaws.com`,
            priority: 10,
          },
        ],
        zone: props.hostedZone,
        recordName: domain,
        deleteExisting: true,
      }),
    )

    const waiter = new EmailIdentityVerificationWaiter(this, 'waiter', {
      emailIdentityName: verification.emailIdentityName,
    })
    waiter.dependable.node.addDependency(records)

    const receiverLambda = new Function(this, 'receiver-lambda', {
      handler: 'lambda.onEvent',
      runtime: Runtime.NODEJS_18_X,
      code: Code.fromAsset(path.join(__dirname, '..', 'dist', 'lambdas')),
      environment: {
        TABLE_NAME: this.table.tableName,
      },
    })
    this.table.grantWriteData(receiverLambda)

    topic.addSubscription(new LambdaSubscription(receiverLambda))

    const { receiptRuleSet } = new ActiveRuleset(this, 'active-ruleset')
    receiptRuleSet.addRule('ruleset', {
      recipients: [domain],
      actions: [
        new actions.Sns({
          topic,
          encoding: EmailEncoding.BASE64,
        }),
      ],
    })
  }
}
