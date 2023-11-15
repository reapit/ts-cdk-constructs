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
})

new CfnOutput(stack, 'client-id', {
  value: product.externalId,
})
