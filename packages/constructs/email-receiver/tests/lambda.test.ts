import { mockClient } from 'aws-sdk-client-mock'
import 'aws-sdk-client-mock-jest'
import { PutCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

import { onEvent } from '../src/lambdas/lambda'
const ddbMock = mockClient(DynamoDBDocumentClient)

process.env.AWS_REGION = 'eu-west-2'
process.env.TABLE_NAME = 'table-name'

const email = `MIME-Version: 1.0
Date: Thu, 31 Aug 2023 11:37:14 +0100
Message-ID: <CADs06q0oCNDEHWAEAAEVLwL=gMc5x1i2zRW1j=YWt2G=eWvodA@mail.gmail.com>
Subject: test
From: Joshua Balfour <josh@joshbalfour.co.uk>
To: asdf@email.rc-preview-135.dev.paas.reapit.cloud
Content-Type: multipart/alternative; boundary="00000000000097e563060435a0ba"

--00000000000097e563060435a0ba
Content-Type: text/plain; charset="UTF-8"

test

--00000000000097e563060435a0ba
Content-Type: text/html; charset="UTF-8"

<div dir="ltr">test</div>

--00000000000097e563060435a0ba--`

describe('email-receiver', () => {
  beforeEach(() => {
    ddbMock.reset()
  })

  describe('lambda', () => {
    it('should put the message into dynamodb', async () => {
      ddbMock.on(PutCommand).resolves({})
      await onEvent({
        Records: [
          {
            EventSource: '',
            EventSubscriptionArn: '',
            EventVersion: '',
            Sns: {
              Message: JSON.stringify({
                mail: {
                  messageId: 'messageId',
                  timestamp: 'timestamp',
                  destination: ['destination@test.com'],
                  source: 'sender@test.com',
                },
                content: Buffer.from(email, 'utf-8').toString('base64'),
              }),
              MessageAttributes: {},
              MessageId: '',
              Signature: '',
              SignatureVersion: '',
              SigningCertUrl: '',
              Subject: '',
              Timestamp: '',
              TopicArn: '',
              Type: '',
              UnsubscribeUrl: '',
            },
          },
        ],
      })
      expect(ddbMock).toReceiveCommandWith(PutCommand, {
        Item: {
          html: '<div dir="ltr">test</div>\n',
          id: 'messageId',
          recipient: 'destination@test.com',
          sender: 'sender@test.com',
          subject: 'test',
          text: 'test\n',
          timestamp: 'timestamp',
        },
        TableName: 'table-name',
      })
    })
  })
})
