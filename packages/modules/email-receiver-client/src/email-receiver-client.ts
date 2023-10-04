import { ComparisonOperator, DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb'
import { QueryCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { validate } from '@aws-sdk/util-arn-parser'
import type { EmailMessage } from '../../email-receiver-types/src'
export type { EmailMessage } from '../../email-receiver-types/src'

export class EmailReceiverClient {
  private docClient: DynamoDBDocumentClient
  tableName: string

  constructor(config: DynamoDBClientConfig & { tableArn: string }) {
    if (!config.tableArn) {
      throw new Error('tableArn not present')
    }
    if (!validate(config.tableArn)) {
      throw new Error('invalid tableArn')
    }
    const [, , , region, , resourceName] = config.tableArn.split(':')
    const [, tableName] = resourceName.split('/')
    const client = new DynamoDBClient({
      ...config,
      region,
    })
    this.docClient = DynamoDBDocumentClient.from(client)
    this.tableName = tableName
  }

  async getRecipientEmails(recipient: string) {
    if (!recipient.includes('@')) {
      throw new Error('recipient must be a full email address including domain')
    }
    const emails = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditions: {
          recipient: {
            ComparisonOperator: ComparisonOperator.EQ,
            AttributeValueList: [recipient],
          },
        },
      }),
    )

    return emails.Items as EmailMessage[]
  }
}
