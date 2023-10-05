import { ensureUserPoolDomain } from './ensure-domain'
import { customResourceWrapper } from '@reapit-cdk/custom-resource-wrapper'

export const onEvent = customResourceWrapper({
  onCreate: async ({ userPoolId }) => {
    const domain = await ensureUserPoolDomain(userPoolId)
    return {
      domain,
    }
  },
})
