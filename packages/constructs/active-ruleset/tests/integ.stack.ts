import { App, Stack } from '@reapit-cdk/integration-tests'
import { ActiveRuleset } from '..'
import { CfnOutput } from 'aws-cdk-lib'

const app = new App()

const stack = new Stack(app, 'active-ruleset-stack')
const activeRuleset = new ActiveRuleset(stack, 'active-ruleset')
new CfnOutput(stack, 'output', {
  value: activeRuleset.receiptRuleSet.receiptRuleSetName,
})
