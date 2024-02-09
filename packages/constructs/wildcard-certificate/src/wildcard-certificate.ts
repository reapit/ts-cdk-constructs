import { Arn, CustomResource, Duration, Stack, Token } from 'aws-cdk-lib'
import { Provider } from 'aws-cdk-lib/custom-resources'
import { Construct } from 'constructs'
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda'
import { Certificate, ICertificate } from 'aws-cdk-lib/aws-certificatemanager'
import { PolicyStatement } from 'aws-cdk-lib/aws-iam'
import * as path from 'path'
import { HostedZone } from 'aws-cdk-lib/aws-route53'

type DetailedDomain = {
  domainName: string
  hostedZoneArn?: string
  account?: string
  roleArn?: string
  includeParent?: boolean
}
type Domain = DetailedDomain | string
export interface WildcardCertificateProps {
  domains: Domain[]
}

const strIsDefined = (str: string | undefined): str is string => !!str

export class WildcardCertificate extends Construct {
  certificate: ICertificate

  constructor(scope: Construct, id: string, props: WildcardCertificateProps) {
    super(scope, id)

    const lambda = new Function(this, 'lambda', {
      handler: 'lambda.onEvent',
      timeout: Duration.minutes(9), // 5 min timeout for cert + 3 min timeout for r53 record change + 1 min wiggle room
      runtime: Runtime.NODEJS_18_X,
      code: Code.fromAsset(path.join(__dirname, '..', 'dist', 'lambda')),
    })
    lambda.addToRolePolicy(
      new PolicyStatement({
        actions: ['acm:DescribeCertificate', 'acm:ListCertificates', 'acm:RequestCertificate'],
        resources: ['*'],
      }),
    )
    const domains = this.resolveDomainMappings(props.domains)

    this.addRolesToLambda(lambda, domains)

    const provider = new Provider(this, 'provider', {
      onEventHandler: lambda,
    })
    const cr = new CustomResource(this, 'resource', {
      serviceToken: provider.serviceToken,
      properties: {
        domainMappings: domains.map(({ domainName, roleArn, hostedZoneArn }) => ({
          parentDomainName: domainName,
          hostedZoneId: Arn.extractResourceName(hostedZoneArn, 'hostedzone'),
          roleArn,
        })),
      },
    })

    this.certificate = Certificate.fromCertificateArn(this, 'wildcard-cert', cr.getAttString('certificateArn'))
  }

  private addRolesToLambda(lambda: Function, domains: (DetailedDomain & { account: string; hostedZoneArn: string })[]) {
    const scopeAccount = Stack.of(this).account

    const sameAccountZones = domains
      .filter(({ account }) => account === scopeAccount)
      .map(({ hostedZoneArn }) => hostedZoneArn)

    if (sameAccountZones.length) {
      lambda.addToRolePolicy(
        new PolicyStatement({
          actions: ['route53:ChangeResourceRecordSets'],
          resources: sameAccountZones,
        }),
      )
    }

    const externalRoles = domains.map(({ roleArn }) => roleArn).filter(strIsDefined)
    if (externalRoles.length) {
      lambda.addToRolePolicy(
        new PolicyStatement({
          actions: ['sts:AssumeRole'],
          resources: externalRoles,
        }),
      )
    }
  }

  private resolveDomainMappings(domains: Domain[]) {
    const scopeAccount = Stack.of(this).account

    return domains
      .map((mapping) => {
        if (typeof mapping === 'string') {
          return {
            domainName: mapping,
          }
        }
        return mapping
      })
      .map((mapping) => {
        const account = mapping.account ?? scopeAccount
        if (account !== scopeAccount && !mapping.roleArn) {
          throw new Error('roleArn must be provided when hosted zone is cross-account')
        }
        if (!mapping.hostedZoneArn) {
          if (Token.isUnresolved(Stack.of(this).region) || Token.isUnresolved(Stack.of(this).account)) {
            throw new Error('Stack region and account must be specified if hostedZoneArn is not specified')
          }
        }
        const hostedZoneArn =
          mapping.hostedZoneArn ??
          HostedZone.fromLookup(this, 'lookup-' + mapping.domainName, {
            domainName: mapping.domainName,
          }).hostedZoneArn

        if (!account) {
          throw new Error('unable to resolve account from hostedZoneArn ' + hostedZoneArn)
        }

        return {
          ...mapping,
          account,
          hostedZoneArn,
        }
      })
  }
}
