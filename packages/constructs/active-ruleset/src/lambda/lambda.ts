import { ensureActiveRuleSet, deleteIfEmpty } from './ensure-active-ruleset'
import { customResourceWrapper } from '../../../../libs/custom-resource-wrapper/src'

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
