import { requestQuotas } from './request-quota'
import { customResourceWrapper } from '@reapit-cdk/custom-resource-wrapper'

export const onEvent = customResourceWrapper({
  onCreate: ({ quotas, config }) => requestQuotas(quotas, config),
  onUpdate: ({ quotas, config }) => requestQuotas(quotas, config),
})
