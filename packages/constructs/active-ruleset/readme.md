# @reapit-cdk/active-ruleset

This construct returns the currently active SES receipt RuleSet, or creates one. This enables you to add rules to it.

## npm Package Installation:
```sh
yarn add --dev @reapit-cdk/active-ruleset
# or
npm install @reapit-cdk/active-ruleset --save-dev
```

## Usage
```ts
import { CfnOutput, Stack, App } from 'aws-cdk-lib'
import { ActiveRuleset } from '@reapit-cdk/active-ruleset'

const app = new App()
const stack = new Stack(app, 'stack-name')
const activeRuleset = new ActiveRuleset(stack, 'active-ruleset')
new CfnOutput(stack, 'activeRulesetName', {
  value: activeRuleset.receiptRuleSet.receiptRuleSetName,
})
```