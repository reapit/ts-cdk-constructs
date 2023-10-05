import { SESMail, SESReceipt, SNSEvent } from 'aws-lambda'
import { simpleParser } from 'mailparser'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { PutCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { EmailMessage } from '@reapit-cdk/email-receiver-types'

type SESMessage = {
  mail: SESMail
  notificationType: string
  receipt: SESReceipt
  content: string
}

const transformMessage = async ({
  mail: {
    messageId,
    timestamp,
    destination: [recipient],
    source,
  },
  content,
}: SESMessage): Promise<EmailMessage> => {
  const { html, text, subject } = await simpleParser(Buffer.from(content, 'base64').toString('utf-8'))

  return {
    id: messageId,
    timestamp,
    sender: source,
    recipient,
    html: html || undefined,
    text,
    subject,
  }
}

const client = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
})

const storeMessage = async (message: EmailMessage) => {
  await docClient.send(
    new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: message,
    }),
  )
}

export const onEvent = async (event: SNSEvent) => {
  await Promise.all(
    event.Records.map(async (record) => {
      const message = JSON.parse(record.Sns.Message) as SESMessage
      const rptMessage = await transformMessage(message)
      await storeMessage(rptMessage)
    }),
  )
}
