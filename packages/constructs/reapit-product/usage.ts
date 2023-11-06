import { CfnOutput, Stack, App } from 'aws-cdk-lib'
import { ReapitProductProvider } from '@reapit-cdk/reapit-product'

const app = new App()
const stack = new Stack(app, 'stack-name')

const productProvider = new ReapitProductProvider(stack, 'product-provider', {
  organisationsServiceUrl: '',
})

const product = productProvider.createProduct(stack, 'product', {
  name: 'a product name',
})

new CfnOutput(stack, 'client-id', {
  value: product.externalId,
})
