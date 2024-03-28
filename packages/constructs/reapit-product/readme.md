# @reapit-cdk/reapit-product


![npm version](https://img.shields.io/npm/v/@reapit-cdk/reapit-product)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/reapit-product)
![coverage: 0%25](https://img.shields.io/badge/coverage-0%25-red)
![Integ Tests: X](https://img.shields.io/badge/Integ%20Tests-X-red)

Creates a product in the organisations service

## Package Installation:

```sh
yarn add --dev @reapit-cdk/reapit-product
# or
npm install @reapit-cdk/reapit-product --save-dev
```

## Usage
```ts
import { CfnOutput, Stack, App } from 'aws-cdk-lib'
import { ReapitProductProvider } from '@reapit-cdk/reapit-product'
import { RestApi } from 'aws-cdk-lib/aws-apigateway'

const app = new App()
const stack = new Stack(app, 'stack-name')

const orgsApiGwId = '' // imported from somewhere or hard coded

const organisationsServiceApiGateway = RestApi.fromRestApiId(stack, 'orgs-api-gw', orgsApiGwId)

const productProvider = new ReapitProductProvider(stack, 'product-provider', {
  organisationsServiceApiGateway,
  stageName: 'api',
})

const product = productProvider.createProduct(stack, 'product', {
  name: 'a product name',
  callbackUrls: [],
  grant: 'authorizationCode',
  isInternalApp: true,
  requiresUserAdmin: false,
  scopes: [],
  signoutUrls: [],
})

new CfnOutput(stack, 'client-id', {
  value: product.externalId,
})

```