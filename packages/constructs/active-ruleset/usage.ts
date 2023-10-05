import { CfnOutput, Stack, App } from 'aws-cdk-lib'
import { ActiveRuleset } from '@reapit-cdk/active-ruleset'

const app = new App()
const stack = new Stack(app, 'stack-name')
const activeRuleset = new ActiveRuleset(stack, 'active-ruleset')
new CfnOutput(stack, 'activeRulesetName', {
  value: activeRuleset.receiptRuleSet.receiptRuleSetName,
})
