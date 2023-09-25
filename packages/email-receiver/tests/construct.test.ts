import { Template } from 'aws-cdk-lib/assertions'
import * as cdk from 'aws-cdk-lib'
import { EmailReceiver } from '../src'
import { HostedZone } from 'aws-cdk-lib/aws-route53'

const synth = () => {
  const app = new cdk.App()
  const stack = new cdk.Stack(app, 'stack', {
    env: {
      region: 'eu-west-2',
    },
  })
  const hostedZone = new HostedZone(stack, 'hostedZone', {
    zoneName: 'example.org',
  })
  const emailReceiver = new EmailReceiver(stack, 'domain', {
    hostedZone,
  })
  const template = Template.fromStack(stack)
  return {
    emailReceiver,
    template,
    stack,
  }
}

const hostedZoneLogicalId = 'hostedZone861779BD'
const snsTopicLogicalId = 'domaintopic47A3E1DD'

describe('email-receiver', () => {
  test('synthesizes', () => {
    const { emailReceiver, template } = synth()
    expect(emailReceiver).toBeDefined()
    expect(template).toBeDefined()
  })
  test('creates the lambda', () => {
    const { template } = synth()
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'lambda.onEvent',
      Environment: {
        Variables: { TABLE_NAME: { Ref: 'domaintable03D946BB' } },
      },
    })
  })
  test('creates the table', () => {
    const { template } = synth()
    template.hasResourceProperties('AWS::DynamoDB::Table', {})
  })
  test('creates the topic', () => {
    const { template } = synth()
    template.hasResourceProperties('AWS::SNS::Topic', {})
  })
  test('creates the subscription', () => {
    const { template } = synth()
    template.hasResourceProperties('AWS::SNS::Subscription', {
      Endpoint: { 'Fn::GetAtt': ['domainreceiverlambda7E2569DF', 'Arn'] },
      Protocol: 'lambda',
      TopicArn: { Ref: snsTopicLogicalId },
    })
  })
  it('sends ses emails to the sns topic', () => {
    const { template } = synth()
    template.hasResourceProperties('AWS::SES::ReceiptRule', {
      RuleSetName: { 'Fn::GetAtt': ['domainactiverulesetresource4EBFEF3B', 'ruleSetName'] },
      Rule: {
        Actions: [
          {
            SNSAction: {
              Encoding: 'Base64',
              TopicArn: { Ref: snsTopicLogicalId },
            },
          },
        ],
        Enabled: true,
        Recipients: ['email.example.org'],
      },
    })
  })
  test('creates the DKIM records', () => {
    const { template } = synth()
    const domainIdentityLogicalId = 'domainIdentityC6435A28'
    template.hasResourceProperties('AWS::Route53::RecordSet', {
      Type: 'CNAME',
      HostedZoneId: { Ref: hostedZoneLogicalId },
      ResourceRecords: [
        {
          'Fn::GetAtt': [domainIdentityLogicalId, 'DkimDNSTokenValue1'],
        },
      ],
      Name: {
        'Fn::GetAtt': [domainIdentityLogicalId, 'DkimDNSTokenName1'],
      },
    })
    template.hasResourceProperties('AWS::Route53::RecordSet', {
      Type: 'CNAME',
      HostedZoneId: { Ref: hostedZoneLogicalId },
      ResourceRecords: [
        {
          'Fn::GetAtt': [domainIdentityLogicalId, 'DkimDNSTokenValue2'],
        },
      ],
      Name: {
        'Fn::GetAtt': [domainIdentityLogicalId, 'DkimDNSTokenName2'],
      },
    })
    template.hasResourceProperties('AWS::Route53::RecordSet', {
      Type: 'CNAME',
      HostedZoneId: { Ref: hostedZoneLogicalId },
      ResourceRecords: [
        {
          'Fn::GetAtt': [domainIdentityLogicalId, 'DkimDNSTokenValue3'],
        },
      ],
      Name: {
        'Fn::GetAtt': [domainIdentityLogicalId, 'DkimDNSTokenName3'],
      },
    })
  })
  test('creates the MX record', () => {
    const { template } = synth()
    template.hasResourceProperties('AWS::Route53::RecordSet', {
      Type: 'MX',
      HostedZoneId: { Ref: hostedZoneLogicalId },
      Name: 'email.example.org.',
      ResourceRecords: ['10 inbound-smtp.eu-west-2.amazonaws.com'],
    })
  })
  test('errors when stack region is unresolved', () => {
    const app = new cdk.App()
    const stack = new cdk.Stack(app, 'stack')
    const hostedZone = new HostedZone(stack, 'hostedZone', {
      zoneName: 'example.org',
    })
    expect(() => {
      new EmailReceiver(stack, 'domain', {
        hostedZone,
      })
    }).toThrowError('stack region unresolved, please be explicit')
  })
})
