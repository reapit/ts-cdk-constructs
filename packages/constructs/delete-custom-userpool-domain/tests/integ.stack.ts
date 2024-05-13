import { App, Stack } from '@reapit-cdk/integration-tests'
import { UserPool } from 'aws-cdk-lib/aws-cognito'
import { CfnOutput } from 'aws-cdk-lib'
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53'
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager'
import { UserPoolDomainTarget } from 'aws-cdk-lib/aws-route53-targets'
import { DeleteCustomUserPoolDomain } from '../dist'

const app = new App()

const env = {
  account: process.env.AWS_ACCOUNT,
  region: 'us-east-1',
}

if (!process.env.INTEG_DOMAIN) {
  throw new Error('process.env.INTEG_DOMAIN required')
}
const parentDomainName = process.env.INTEG_DOMAIN

if (!process.env.INTEG_ZONE_ID) {
  throw new Error('process.env.INTEG_ZONE_ID required')
}

const stack = new Stack(app, 'delete-custom-userpool-domain-test-stack', { env })

const domainName = `delete-userpool-test.${parentDomainName}`

const hostedZone = HostedZone.fromHostedZoneAttributes(stack, 'zone', {
  hostedZoneId: process.env.INTEG_ZONE_ID,
  zoneName: parentDomainName,
})

const certificate = new Certificate(stack, 'Certificate', {
  domainName: domainName,
  validation: CertificateValidation.fromDns(hostedZone),
})

const userPool = new UserPool(stack, 'UserPool')

const domain = userPool.addDomain('Domain', {
  customDomain: {
    domainName,
    certificate,
  },
})

new ARecord(stack, 'ARecord', {
  zone: hostedZone,
  recordName: domainName,
  target: RecordTarget.fromAlias(new UserPoolDomainTarget(domain)),
})

new CfnOutput(stack, 'userPoolId', { value: userPool.userPoolId })

const deleter = new DeleteCustomUserPoolDomain(stack, 'DeleteCustomDomain', { userPool })
deleter.node.addDependency(domain)
