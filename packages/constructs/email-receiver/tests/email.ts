import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { randomUUID } from 'crypto'
import { EmailMessage, EmailReceiverClient } from '@reapit-cdk/email-receiver-client'

export const sendTestEmail = async () => {
  const client = new SESClient()
  const domainName = process.env.INTEG_DOMAIN ?? ''
  const recipient = `${randomUUID()}@email.${domainName}`
  await client.send(
    new SendEmailCommand({
      Destination: {
        ToAddresses: [recipient],
      },
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
    }),
  )
  return {
    recipient,
  }
}

const waitForEmail = async (
  comparator: (message: EmailMessage) => boolean,
  client: EmailReceiverClient,
  emailAddress: string,
  ctr: number = 0,
  limit: number = 5,
): Promise<string> => {
  if (ctr >= limit) {
    throw new Error(`waitForEmail took more than ${limit} iterations`)
  }
  const emails = await client.getRecipientEmails(emailAddress)
  const email = emails.find((message) => message.subject === 'Welcome to Reapit Connect')
  if (!email) {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    return waitForEmail(comparator, client, emailAddress, ctr + 1, limit)
  }
  const { html } = email
  if (!html) {
    throw new Error('unable to get email body')
  }
  return html
}

export const waitForTestEmail = async (tableArn: string, receiver: string) => {
  const client = new EmailReceiverClient({
    tableArn,
  })

  const email = await waitForEmail((message) => message.subject === 'Test email', client, receiver)

  return email
}
