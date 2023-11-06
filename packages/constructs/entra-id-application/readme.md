# @reapit-cdk/entra-id-application


![npm version](https://img.shields.io/npm/v/@reapit-cdk/entra-id-application)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/entra-id-application)
![coverage: 0%25](https://img.shields.io/badge/coverage-0%25-red)
![Integ Tests: X](https://img.shields.io/badge/Integ%20Tests-X-red)

This construct creates and manages a Microsoft Entra ID Application

## Package Installation:

```sh
yarn add --dev @reapit-cdk/entra-id-application
# or
npm install @reapit-cdk/entra-id-application --save-dev
```

## Usage
```ts
import { CfnOutput, Stack, App, Duration } from 'aws-cdk-lib'
import { EntraIDApplication } from '@reapit-cdk/entra-id-application'
import { Secret } from 'aws-cdk-lib/aws-secretsmanager'

const app = new App()
const stack = new Stack(app, 'stack-name')
const entraApp = new EntraIDApplication(stack, 'entra-id-app', {
  /**
   * 1. Create an application in Entra ID with scopes:
   *  - Application.ReadWrite.All
   * 2. Create a client secret which lasts a day
   * 3. Run the setup script and follow the instructions from there.
   * (Clone the repo
   *  run yarn
   *  cd packages/constructs/entra-id-application
   *  yarn setup
   *    --clientId <client id aka app id>
   *    --clientSecret <client secret value>
   *    --tenantId <your tenant id>
   *    --keyId <secret id>
   * )
   */
  bootstrapClientSecret: Secret.fromSecretCompleteArn(stack, 'bootstrap-client-secret', 'bootstrap-client-secret-arn'),
  config: {
    displayName: 'My Application',
    requiredResourceAccess: [
      {
        resourceAppId: '00000003-0000-0000-c000-000000000000', // microsoft graph
        resourceAccess: [
          {
            id: '14dad69e-099b-42c9-810b-d002981feec1', // user: profile
            type: 'Scope',
          },
          {
            id: '37f7f235-527c-4136-accd-4a02d197296e', // user: openid
            type: 'Scope',
          },
          {
            id: '64a6cdd6-aab1-4aaf-94b8-3cc8405e90d0', // user: email
            type: 'Scope',
          },
        ],
      },
    ],
    web: {
      redirectUris: ['https://example.org'],
    },
  },
})

const { secret } = entraApp.createKey(stack, 'key', {
  keyInfo: {
    displayName: 'api',
  },
  validFor: Duration.days(31),
})

new CfnOutput(stack, 'appId', {
  value: entraApp.getAttString('appId'),
})

new CfnOutput(stack, 'client-secret-arn', {
  value: secret.secretArn,
})

// This is the client secret (don't do this)
new CfnOutput(stack, 'client-secret-secretText', {
  value: secret.secretValueFromJson('secretText').toString(),
})

```