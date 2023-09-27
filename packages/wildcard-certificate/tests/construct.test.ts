import { Template } from 'aws-cdk-lib/assertions'
import * as cdk from 'aws-cdk-lib'
import { WildcardCertificate, WildcardCertificateProps } from '../src'

const synth = (domains?: WildcardCertificateProps['domains']) => {
  const app = new cdk.App()
  const stack = new cdk.Stack(app, 'stack', {
    env: {
      account: '111111',
      region: 'eu-west-2',
    },
  })
  const wildcardCertificate = new WildcardCertificate(stack, 'cert', {
    domains: domains ?? ['example.org'],
  })
  const template = Template.fromStack(stack)
  return {
    wildcardCertificate,
    template,
    stack,
  }
}

describe('wildcard-certificate', () => {
  test('synthesizes', () => {
    const { wildcardCertificate, template } = synth()
    expect(wildcardCertificate).toBeDefined()
    expect(template).toBeDefined()
  })
  test('the construct has the right property', () => {
    const { wildcardCertificate } = synth()
    expect(wildcardCertificate.certificate).toBeTruthy()
  })
  test('creates the lambda', () => {
    const { template } = synth()
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'lambda.onEvent',
    })
  })
  test('the lambda has the right permissions', () => {
    const { template } = synth()
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: ['acm:DescribeCertificate', 'acm:ListCertificates', 'acm:RequestCertificate'],
            Resource: '*',
          },
          {},
        ],
      },
    })
  })
  test('creates custom resource with lambda', () => {
    const { template } = synth()
    template.hasResourceProperties('AWS::CloudFormation::CustomResource', {
      ServiceToken: { 'Fn::GetAtt': ['certproviderframeworkonEvent0AE53E79', 'Arn'] },
      domainMappings: [{}],
    })
  })
  test('custom resource has the right domainMapping - string[]', () => {
    const { template } = synth()
    const res = template.findResources('AWS::CloudFormation::CustomResource')
    const domainMappings = Object.values(res)[0].Properties.domainMappings
    expect(domainMappings).toHaveLength(1)
    expect(domainMappings[0].parentDomainName).toBe('example.org')
    expect(domainMappings[0].hostedZoneId).toBe('DUMMY')
  })
  test('custom resource has the right domainMapping - {}[]', () => {
    const { template } = synth([
      {
        domainName: 'example.org',
        hostedZoneArn: 'arn:partition:route53::account:hostedzone/Id',
        roleArn: 'arn:aws:iam::account:role/role-name-with-path',
      },
    ])
    const res = template.findResources('AWS::CloudFormation::CustomResource')
    const domainMappings = Object.values(res)[0].Properties.domainMappings
    expect(domainMappings).toHaveLength(1)
    expect(domainMappings[0].parentDomainName).toBe('example.org')
    expect(domainMappings[0].hostedZoneId).toBe('Id')
    expect(domainMappings[0].roleArn).toBe('arn:aws:iam::account:role/role-name-with-path')
  })
  test('errors when env is not resolved and hostedZoneArn is not specified', () => {
    const app = new cdk.App()
    const stack = new cdk.Stack(app)
    expect(() => {
      new WildcardCertificate(stack, 'cert', {
        domains: ['example.org'],
      })
    }).toThrowError('Stack region and account must be specified if hostedZoneArn is not specified')
  })
  test('errors when x-account hosted zone has no accompanying role', () => {
    const app = new cdk.App()
    const stack = new cdk.Stack(app)
    expect(() => {
      new WildcardCertificate(stack, 'cert', {
        domains: [
          {
            domainName: 'example.org',
            hostedZoneArn: 'arn:partition:route53::12345:hostedzone/Id',
          },
        ],
      })
    }).toThrowError('roleArn must be provided when hosted zone is cross-account')
  })
})
