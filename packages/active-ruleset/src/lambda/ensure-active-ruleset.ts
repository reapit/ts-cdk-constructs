import {
  SESClient,
  DescribeActiveReceiptRuleSetCommand,
  CreateReceiptRuleSetCommand,
  SetActiveReceiptRuleSetCommand,
  DescribeReceiptRuleSetCommand,
  RuleSetDoesNotExistException,
} from '@aws-sdk/client-ses'

const client = new SESClient({})

const ensureRuleSet = async (name: string) => {
  try {
    await client.send(
      new DescribeReceiptRuleSetCommand({
        RuleSetName: name,
      }),
    )
    console.log('found existing ruleset', name)
    return name
  } catch (e) {
    if (e instanceof RuleSetDoesNotExistException) {
      console.log('not found ruleset, creating', name)
      await client.send(
        new CreateReceiptRuleSetCommand({
          RuleSetName: name,
        }),
      )
      console.log('created ruleset', name)
      return name
    }
    throw e
  }
}

const getActiveRuleSet = async () => {
  const activeRuleSet = await client.send(new DescribeActiveReceiptRuleSetCommand({}))
  console.log('found existing ruleset', activeRuleSet.Metadata?.Name)
  return activeRuleSet.Metadata?.Name
}

const activateRuleSet = async (name: string) => {
  console.log('activating ruleset', name)
  await client.send(
    new SetActiveReceiptRuleSetCommand({
      RuleSetName: name,
    }),
  )
  console.log('activated', name)
  return name
}

export const ensureActiveRuleSet = async () => {
  const existing = await getActiveRuleSet()
  if (existing) {
    return existing
  }

  const name = 'default'
  await ensureRuleSet(name)
  await activateRuleSet(name)
  return name
}
