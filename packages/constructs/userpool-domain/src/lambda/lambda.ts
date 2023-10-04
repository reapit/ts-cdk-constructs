import { ensureUserPoolDomain } from './ensure-domain'
import { customResourceWrapper } from '../../../../libs/custom-resource-wrapper/src'

export const onEvent = customResourceWrapper({
  onCreate: async ({ userPoolId }) => {
    const domain = await ensureUserPoolDomain(userPoolId)
    return {
      domain,
    }
  },
})
