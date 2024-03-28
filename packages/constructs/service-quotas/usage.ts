import { Stack, App } from 'aws-cdk-lib'
import { AWSService, AmazonCloudFrontQuota, ServiceQuotas } from '@reapit-cdk/service-quotas'

const app = new App()
const stack = new Stack(app, 'stack-name')
const quotas = new ServiceQuotas(stack, 'service-quotas', {
  // Fail the stack if your requests aren't granted yet
  failIfNotGranted: true,
  // Make another request if an existing one is denied
  rerequestWhenDenied: true,
})

quotas.requestQuota(
  // region
  'us-east-1',
  // service (use the AWSService.${Service} helper or specify the e.g. 'cloudfront' string as any)
  AWSService.AMAZON_CLOUD_FRONT,
  // quota (use the ${Service}Quota e.g. AmazonCloudFrontQuota helper or specify the 'LL-' string as any)
  AmazonCloudFrontQuota.CACHE_BEHAVIORS_PER_DISTRIBUTION,
  // desired value
  100,
)
