import { App, Stack } from '@reapit-cdk/integration-tests'
import { HostedZone } from 'aws-cdk-lib/aws-route53'
import { EmailReceiver } from '../dist'
import { CfnOutput } from 'aws-cdk-lib'

const app = new App()

const stack = new Stack(app, 'email-receiver-test-stack')

if (!process.env.INTEG_DOMAIN) {
  throw new Error('process.env.INTEG_DOMAIN required')
}
if (!process.env.INTEG_ZONE_ID) {
  throw new Error('process.env.INTEG_ZONE_ID required')
}
const domainName = process.env.INTEG_DOMAIN ?? ''

const hostedZone = HostedZone.fromHostedZoneAttributes(stack, 'zone', {
  hostedZoneId: process.env.INTEG_ZONE_ID,
  zoneName: domainName,
})

const emailReceiver = new EmailReceiver(stack, 'email-receiver', {
  hostedZone,
})

new CfnOutput(stack, 'output', {
  value: emailReceiver.table.tableArn,
})
