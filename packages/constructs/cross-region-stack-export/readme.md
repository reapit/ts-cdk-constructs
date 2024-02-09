# @reapit-cdk/cross-region-stack-export


![npm version](https://img.shields.io/npm/v/@reapit-cdk/cross-region-stack-export)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/cross-region-stack-export)
![coverage: 71.85%25](https://img.shields.io/badge/coverage-71.85%25-orange)
![Integ Tests: X](https://img.shields.io/badge/Integ%20Tests-X-red)

Allows you to share values between stack across regions and accounts.

## Package Installation:

```sh
yarn add --dev @reapit-cdk/cross-region-stack-export
# or
npm install @reapit-cdk/cross-region-stack-export --save-dev
```

## Usage
```ts
import { CfnOutput, Stack, App } from 'aws-cdk-lib'
import { CrossRegionStackExport } from '@reapit-cdk/cross-region-stack-export'
import { Bucket } from 'aws-cdk-lib/aws-s3'

const app = new App()
const euStack = new Stack(app, 'stack-eu', {
  env: {
    account: '11111111',
    region: 'eu-west-1',
  },
})

const exporter = new CrossRegionStackExport(euStack, 'exporter')
exporter.setValue('thing', 'avalue')

const bucket = new Bucket(euStack, 'bucket')
exporter.setValue('bucketArn', bucket.bucketArn)

const usStack = new Stack(app, 'stack-us', {
  env: {
    account: '2222222222',
    region: 'us-east-1',
  },
})

const importer = exporter.getImporter(usStack, 'eu-importer')

const euThing = importer.getValue('thing')
const euBucket = Bucket.fromBucketArn(usStack, 'eu-bucket', importer.getValue('bucketArn'))

new CfnOutput(usStack, 'euThing', {
  value: euThing,
})

new CfnOutput(usStack, 'euBucketName', {
  value: euBucket.bucketName,
})

```