import { mockClient } from 'aws-sdk-client-mock'
import 'aws-sdk-client-mock-jest'
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'

import { EmailReceiverClient } from '../src'
import { ComparisonOperator } from '@aws-sdk/client-dynamodb'

const ddbMock = mockClient(DynamoDBDocumentClient)

process.env.AWS_REGION = 'eu-west-2'
process.env.TABLE_NAME = 'table-name'

describe('email-receiver-client', () => {
  beforeEach(() => {
    ddbMock.reset()
  })

  it('should grab all email from that sender', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [{ id: '1' }, { id: '2' }, { id: '3' }],
    })
    const client = new EmailReceiverClient({
      tableArn: 'arn:aws:dynamodb:us-east-1:123:table/table-name',
    })
    const results = await client.getRecipientEmails('recipient@test.com')
    expect(ddbMock).toReceiveCommandWith(QueryCommand, {
      TableName: 'table-name',
      KeyConditions: {
        recipient: {
          ComparisonOperator: ComparisonOperator.EQ,
          AttributeValueList: ['recipient@test.com'],
        },
      },
    })
    expect(results).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }])
  })
})
