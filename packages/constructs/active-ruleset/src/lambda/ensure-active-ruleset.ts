import {
  SESClient,
  DescribeActiveReceiptRuleSetCommand,
  CreateReceiptRuleSetCommand,
  SetActiveReceiptRuleSetCommand,
  DescribeReceiptRuleSetCommand,
  RuleSetDoesNotExistException,
  DeleteReceiptRuleSetCommand,
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

const defaultName = 'rpt-cdk-active-ruleset'

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

  await ensureRuleSet(defaultName)
  await activateRuleSet(defaultName)
  return defaultName
}

export const deleteIfEmpty = async () => {
  const activeRuleSet = await client.send(new DescribeActiveReceiptRuleSetCommand({}))
  const activeName = activeRuleSet.Metadata?.Name
  console.log('found active ruleset', activeName)
  if (activeName !== defaultName) {
    console.log('active ruleset is not one we created, skipping deletion')
    return
  }
  if (activeRuleSet.Rules?.length) {
    console.log('active ruleset contains rules, skipping deletion')
    return
  }

  console.log(`deactivating ruleset "${activeName}"`)
  await client.send(
    new SetActiveReceiptRuleSetCommand({
      RuleSetName: undefined,
    }),
  )
  console.log(`deleting ruleset "${activeName}"`)
  await client.send(
    new DeleteReceiptRuleSetCommand({
      RuleSetName: activeName,
    }),
  )
  console.log(`deleted ruleset "${activeName}"`)
}
