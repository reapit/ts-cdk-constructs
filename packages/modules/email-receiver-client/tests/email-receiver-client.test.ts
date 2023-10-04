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

  it('should error if a full email address isnt provided', async () => {
    const client = new EmailReceiverClient({
      tableArn: 'arn:aws:dynamodb:us-east-1:123:table/table-name',
    })
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    expect(() => client.getRecipientEmails('recipient')).rejects.toThrowError(
      'recipient must be a full email address including domain',
    )
  })
  it('should error if an invalid table arn is provided', () => {
    expect(
      () =>
        new EmailReceiverClient({
          tableArn: 'junk',
        }),
    ).toThrowError('invalid tableArn')
  })
  it('should error if no table arn is provided', () => {
    expect(
      () =>
        //@ts-expect-error
        new EmailReceiverClient({}),
    ).toThrowError('tableArn not present')
  })
})
