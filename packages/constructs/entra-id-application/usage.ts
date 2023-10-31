import { CfnOutput, Stack, App, Duration } from 'aws-cdk-lib'
import { EntraIDApplication } from '@reapit-cdk/entra-id-application'
import { Secret } from 'aws-cdk-lib/aws-secretsmanager'

const app = new App()
const stack = new Stack(app, 'stack-name')
const entraApp = new EntraIDApplication(stack, 'entra-id-app', {
  /**
   * 1. Create an application in Entra ID with scopes:
   *  - Application.ReadWrite.OwnedBy
   * 2. Create a Secret with {
   *  "clientId": "",
   *  "clientSecret": "",
   *  "tenantId": ""
   * }
   * 3. Copy the secret ARN and use it here
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
