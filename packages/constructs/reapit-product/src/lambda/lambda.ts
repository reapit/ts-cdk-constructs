import { customResourceWrapper } from '@reapit-cdk/custom-resource-wrapper'
import { createProduct, CreateProduct, deleteProduct, updateProduct } from './product'

export const onEvent = customResourceWrapper({
  onCreate: async (properties) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { requestId, serviceToken, ...product } = properties
    const productObj = await createProduct(product as CreateProduct)
    return {
      physicalResourceId: productObj.id,
      ...productObj,
      scopes: productObj.scopes ? productObj.scopes.join(',') : '',
    }
  },
  onUpdate: async (properties) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { requestId, serviceToken, physicalResourceId, ...product } = properties
    if (!physicalResourceId) {
      throw new Error('no physical resource id present on update request')
    }
    const productObj = await updateProduct(physicalResourceId, product as CreateProduct)
    return {
      physicalResourceId: productObj?.id,
      ...productObj,
      scopes: productObj?.scopes ? productObj.scopes.join(',') : '',
    }
  },
  onDelete: async ({ physicalResourceId }) => {
    if (!physicalResourceId) {
      throw new Error('no physical resource id present on deletion request')
    }
    await deleteProduct(physicalResourceId)
  },
})
