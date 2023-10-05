import { EmailReceiverClient } from '@reapit-cdk/email-receiver-client'
import { randomUUID } from 'crypto'

const emailClient = new EmailReceiverClient({
  // ...dynamoDbClient config
  tableArn: '', // imported emailReceiver.table.tableArn from cdk stack via export
})

const domainName = '' // imported emailReceiver.domainName from cdk stack via export

const recipient = `${randomUUID()}@${domainName}`

// ...
// Test code goes here that causes your system to send an email to that recipient
// ...

// @ts-expect-error
const emails = await emailClient.getRecipientEmails(recipient)
const emailWeWant = emails.find((message) => message.subject === "Something You're Testing")
if (!emailWeWant) {
  // retry a few times then throw error
}
// check emailWeWant.body is what you were expecting
