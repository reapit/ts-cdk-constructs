# @reapit-cdk/email-receiver-client

![npm version](https://img.shields.io/npm/v/@reapit-cdk/email-receiver-client) ![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/email-receiver-client) ![coverage: 99.02%](https://img.shields.io/badge/coverage-99.02%-green)

This module helps you write tests which rely on receiving emails. Once you have set up [@reapit-cdk/email-receiver](../../constructs/email-receiver/), this module helps you interact with the dynamodb table it creates. You'll have to export the table arn and domain name from your stack and import them to be used here, using [something like this](https://gist.github.com/joshbalfour/c0deb95f1e5938434ed6f6117dec8662).

## Package Installation:

```sh
yarn add --dev @reapit-cdk/email-receiver-client
# or
npm install @reapit-cdk/email-receiver-client --save-dev
```

## Usage
```ts
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

const emails = await emailClient.getRecipientEmails(recipient)
const emailWeWant = emails.find((message) => message.subject === "Something You're Testing")
if (!emailWeWant) {
  // retry a few times then throw error
}
// check emailWeWant.body is what you were expecting

```