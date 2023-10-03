import { IntegTest, ExpectedResult, App, Stack } from '@reapit-cdk/integration-tests'
import { Duration } from 'aws-cdk-lib'
import { randomUUID } from 'crypto'

import { EmailReceiver } from '../dist'
import { HostedZone } from 'aws-cdk-lib/aws-route53'
import { ComparisonOperator } from '@aws-sdk/client-dynamodb'

const app = new App()

const stack = new Stack(app, 'email-receiver-test-stack')

if (!process.env.INTEG_DOMAIN) {
  throw new Error('process.env.INTEG_DOMAIN required')
}
const domainName = process.env.INTEG_DOMAIN ?? ''

const hostedZone = HostedZone.fromLookup(stack, 'zone', {
  domainName,
})

const emailReceiver = new EmailReceiver(stack, 'email-receiver', {
  hostedZone,
})

const integ = new IntegTest(app, 'EmailReceiverTest', {
  testCases: [stack],
  cdkCommandOptions: {
    destroy: {
      args: {
        force: true,
      },
    },
  },
  diffAssets: true,
  regions: [stack.region],
})

const recipient = `${randomUUID()}@email.${domainName}`

const assertion = integ.assertions
  .awsApiCall('ses', 'SendEmail', {
    Destination: {
      ToAddresses: [recipient],
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: 'This message body contains HTML formatting. It can, for example, contain links like this one: <a class="ulink" href="http://docs.aws.amazon.com/ses/latest/DeveloperGuide" target="_blank">Amazon SES Developer Guide</a>.',
          },
          Text: {
            Charset: 'UTF-8',
            Data: 'This is the message body in text format.',
          },
        },
        Subject: {
          Charset: 'UTF-8',
          Data: 'Test email',
        },
      },
      Source: `integ@email.${domainName}`,
    },
  })
  .next(
    integ.assertions
      .awsApiCall('dynamodb', 'Query', {
        TableName: emailReceiver.table.tableName,
        KeyConditions: {
          recipient: {
            ComparisonOperator: ComparisonOperator.EQ,
            AttributeValueList: [recipient],
          },
        },
      })
      .expect(
        ExpectedResult.objectLike({
          Items: [
            {
              recipient: {
                S: recipient,
              },
              subject: {
                S: 'Test email',
              },
              text: {
                S: 'This is the message body in text format.',
              },
              html: {
                S: 'This message body contains HTML formatting. It can, for example, contain links like this one: <a class="ulink" href="http://docs.aws.amazon.com/ses/latest/DeveloperGuide" target="_blank">Amazon SES Developer Guide</a>.',
              },
              sender: {
                S: `integ@email.${domainName}`,
              },
            },
          ],
        }),
      )
      .waitForAssertions({
        totalTimeout: Duration.seconds(30),
        interval: Duration.seconds(3),
      }),
  )

assertion.provider.addToRolePolicy({
  Effect: 'Allow',
  Action: ['ses:SendEmail'],
  Resource: ['*'],
})

assertion.provider.addToRolePolicy({
  Effect: 'Allow',
  Action: ['dynamodb:Query'],
  Resource: [emailReceiver.table.tableArn],
})
