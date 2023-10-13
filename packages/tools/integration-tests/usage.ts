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
