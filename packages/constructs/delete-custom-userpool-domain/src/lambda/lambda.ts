import { deleteCustomUserPoolDomain } from './delete-custom-userpool-domain'
import { customResourceWrapper } from '@reapit-cdk/custom-resource-wrapper'

export const onEvent = customResourceWrapper({
  onCreate: ({ userPoolId }) => deleteCustomUserPoolDomain(userPoolId),
  onUpdate: ({ userPoolId }, oldProps) => {
    if (userPoolId !== oldProps.userPoolId) {
      return deleteCustomUserPoolDomain(userPoolId)
    }
  },
})
