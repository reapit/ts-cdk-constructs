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
