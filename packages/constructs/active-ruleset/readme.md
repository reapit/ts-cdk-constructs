# @reapit-cdk/active-ruleset

![npm version](https://img.shields.io/npm/v/@reapit-cdk/active-ruleset) ![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/active-ruleset) ![coverage: 99.02%](https://img.shields.io/badge/coverage-99.02%-green) ![Integ Tests: ✔](https://img.shields.io/badge/Integ Tests-✔-green)

This construct returns the currently active SES receipt RuleSet, or creates one. This enables you to add rules to it.

## Package Installation:

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