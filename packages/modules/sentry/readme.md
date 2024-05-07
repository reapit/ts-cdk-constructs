# @reapit-cdk/sentry


![npm version](https://img.shields.io/npm/v/@reapit-cdk/sentry)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/sentry)
![coverage: 85.96%25](https://img.shields.io/badge/coverage-85.96%25-green)

Minimal Sentry SDK

## Package Installation:

```sh
yarn add --dev @reapit-cdk/sentry
# or
npm install @reapit-cdk/sentry --save-dev
```

## Usage
```ts
// for usage with Edge API SDK
// { sentryDsn: string; sentryRelease: string } is required to be in your request env
import { initSentryLogger } from '@reapit-cdk/sentry/dist/edge-api-sentry-logger'
import { JSONResponse, jsonRequestHandler } from '@reapit-cdk/edge-api-sdk'

export const handler = jsonRequestHandler<{ sentryDsn: string; sentryRelease: string }>(
  async (): Promise<JSONResponse<{ something: string }>> => {
    return {
      body: {
        something: 'important',
      },
    }
  },
  (request) => ({
    loggerConfig: {
      transports: [initSentryLogger(request)],
    },
  }),
)

// for browser usage
import { initBrowserSentry } from '@reapit-cdk/sentry/dist/browser'

initBrowserSentry({
  componentName: '',
  dsn: '',
  environment: '',
  release: '',
  sessionId: '',
})

// for browser usage, with breadcrumb integration
import { initBreadcrumbIntegration } from '@reapit-cdk/sentry/dist/browser-breadcrumb-integration'
initBrowserSentry({
  componentName: '',
  dsn: '',
  environment: '',
  release: '',
  sessionId: '',
  integrations: [initBreadcrumbIntegration],
})

```