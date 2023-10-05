# @reapit-cdk/email-receiver-client
![npm version](https://img.shields.io/npm/v/@reapit-cdk/email-receiver-client) ![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/email-receiver-client) <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="114" height="20" role="img" aria-label="coverage: 99.02%"><title>coverage: 99.02%</title><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="114" height="20" rx="3" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="61" height="20" fill="#555"/><rect x="61" width="53" height="20" fill="#97ca00"/><rect width="114" height="20" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110"><text aria-hidden="true" x="315" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="510">coverage</text><text x="315" y="140" transform="scale(.1)" fill="#fff" textLength="510">coverage</text><text aria-hidden="true" x="865" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="430">99.02%</text><text x="865" y="140" transform="scale(.1)" fill="#fff" textLength="430">99.02%</text></g></svg>
This module helps you write tests which rely on receiving emails. Once you have set up [@reapit-cdk/email-receiver](../../constructs/email-receiver/), this module helps you interact with the dynamodb table it creates. You'll have to export the table arn and domain name from your stack and import them to be used here, using [something like this](https://gist.github.com/joshbalfour/c0deb95f1e5938434ed6f6117dec8662).
## Package Installation:
```sh
yarn add --dev undefined
# or
npm install undefined --save-dev
```
## Usage,```ts,import { EmailReceiverClient } from '@reapit-cdk/email-receiver-client'
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
,```