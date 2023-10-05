import { ensureActiveRuleSet, deleteIfEmpty } from './ensure-active-ruleset'
import { customResourceWrapper } from '@reapit-cdk/custom-resource-wrapper'

const handler = async () => {
  const ruleSetName = await ensureActiveRuleSet()
  return {
    ruleSetName,
  }
}

export const onEvent = customResourceWrapper({
  onCreate: handler,
  onUpdate: handler,
  onDelete: deleteIfEmpty,
})
