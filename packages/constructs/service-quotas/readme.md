# @reapit-cdk/service-quotas


![npm version](https://img.shields.io/npm/v/@reapit-cdk/service-quotas)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/service-quotas)
![coverage: 0%25](https://img.shields.io/badge/coverage-0%25-red)
![Integ Tests: X](https://img.shields.io/badge/Integ%20Tests-X-red)

This construct allows you to IaC your service quotas

## Package Installation:

```sh
yarn add --dev @reapit-cdk/service-quotas
# or
npm install @reapit-cdk/service-quotas --save-dev
```

## Usage
```ts
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

```