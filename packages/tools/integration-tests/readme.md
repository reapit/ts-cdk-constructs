# @reapit-cdk/integration-tests


![npm version](https://img.shields.io/npm/v/@reapit-cdk/integration-tests)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/integration-tests)
![coverage: 0%25](https://img.shields.io/badge/coverage-0%25-red)

Easily run integration tests for CDK constructs using Jest. On successful test suite run, snapshots the stack which gets stored in your repo alongside the test. Subsequent test runs will diff the stack against the snapshot, and only run the tests if something changes.

## Package Installation:

```sh
yarn add --dev @reapit-cdk/integration-tests
# or
npm install @reapit-cdk/integration-tests --save-dev
```

## Usage
```ts
// integ.stack.ts
import { App, Stack } from '@reapit-cdk/integration-tests'
import { CfnOutput } from 'aws-cdk-lib'
import { Bucket } from 'aws-cdk-lib/aws-s3'

const app = new App()
const stack = new Stack(app, 'test-stack')
const bucket = new Bucket(stack, 'test-bucket')
new CfnOutput(stack, 'bucketArn', {
  value: bucket.bucketArn,
})

// integ.test.ts
import { IntegrationTest } from '@reapit-cdk/integration-tests'
import * as path from 'path'
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3'

describe('active-rule integration', () => {
  const integ = new IntegrationTest({
    stackFile: path.resolve(__dirname, './integ.stack.ts'),
    stackName: 'test-stack',
  })

  integ.it('should create the bucket', async () => {
    const s3 = new S3Client({
      region: 'eu-central-1',
    })
    const bucketArn = integ.outputs.bucketArn
    // throws if it doesn't exist
    await s3.send(
      new HeadBucketCommand({
        Bucket: bucketArn,
      }),
    )
  })
})

```