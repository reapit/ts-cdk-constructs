# @reapit-cdk/replicated-key
![npm version](https://img.shields.io/npm/v/@reapit-cdk/replicated-key) ![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/replicated-key) <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="114" height="20" role="img" aria-label="coverage: 99.02%"><title>coverage: 99.02%</title><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="114" height="20" rx="3" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="61" height="20" fill="#555"/><rect x="61" width="53" height="20" fill="#97ca00"/><rect width="114" height="20" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110"><text aria-hidden="true" x="315" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="510">coverage</text><text x="315" y="140" transform="scale(.1)" fill="#fff" textLength="510">coverage</text><text aria-hidden="true" x="865" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="430">99.02%</text><text x="865" y="140" transform="scale(.1)" fill="#fff" textLength="430">99.02%</text></g></svg> <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="90" height="20" role="img" aria-label="Integ Tests: X"><title>Integ Tests: X</title><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="90" height="20" rx="3" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="73" height="20" fill="#555"/><rect x="73" width="17" height="20" fill="#e05d44"/><rect width="90" height="20" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110"><text aria-hidden="true" x="375" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="630">Integ Tests</text><text x="375" y="140" transform="scale(.1)" fill="#fff" textLength="630">Integ Tests</text><text aria-hidden="true" x="805" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="70">X</text><text x="805" y="140" transform="scale(.1)" fill="#fff" textLength="70">X</text></g></svg>
Creates a KMS key and replicates it to the desired regions. Useful when replicating secrets across regions.
## Package Installation:
```sh
yarn add --dev undefined
# or
npm install undefined --save-dev
```
## Usage,```ts,import { Stack, App } from 'aws-cdk-lib'
import { ReplicatedKey } from '@reapit-cdk/replicated-key'
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda'

const app = new App()
const stack = new Stack(app, 'stack-name', {
  env: {
    region: 'us-east-1', // region must be specified
  },
})
const key = new ReplicatedKey(stack, 'key', {
  replicaRegions: ['af-south-1', 'cn-north-1'],
})

const lambda = new Function(stack, 'lambda', {
  runtime: Runtime.NODEJS_18_X,
  handler: 'lambda.handler',
  code: Code.fromInline('export const handler = () => {}'),
  environment: {
    usKeyArn: key.getRegionalKey('us-east-1').keyArn,
    afKeyArn: key.getRegionalKey('af-south-1').keyArn,
    cnKeyArn: key.getRegionalKey('cn-north-1').keyArn,
  },
})

key.grantEncryptDecrypt(lambda)
,```