# @reapit-cdk/active-ruleset
![npm version](https://img.shields.io/npm/v/@reapit-cdk/active-ruleset) ![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/active-ruleset) <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="114" height="20" role="img" aria-label="coverage: 99.02%"><title>coverage: 99.02%</title><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="114" height="20" rx="3" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="61" height="20" fill="#555"/><rect x="61" width="53" height="20" fill="#97ca00"/><rect width="114" height="20" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110"><text aria-hidden="true" x="315" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="510">coverage</text><text x="315" y="140" transform="scale(.1)" fill="#fff" textLength="510">coverage</text><text aria-hidden="true" x="865" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="430">99.02%</text><text x="865" y="140" transform="scale(.1)" fill="#fff" textLength="430">99.02%</text></g></svg> <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="92" height="20" role="img" aria-label="Integ Tests: ✔"><title>Integ Tests: ✔</title><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="92" height="20" rx="3" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="73" height="20" fill="#555"/><rect x="73" width="19" height="20" fill="#97ca00"/><rect width="92" height="20" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110"><text aria-hidden="true" x="375" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="630">Integ Tests</text><text x="375" y="140" transform="scale(.1)" fill="#fff" textLength="630">Integ Tests</text><text aria-hidden="true" x="815" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="90">✔</text><text x="815" y="140" transform="scale(.1)" fill="#fff" textLength="90">✔</text></g></svg>
This construct returns the currently active SES receipt RuleSet, or creates one. This enables you to add rules to it.
## Package Installation:
```sh
yarn add --dev undefined
# or
npm install undefined --save-dev
```
## Usage,```ts,import { CfnOutput, Stack, App } from 'aws-cdk-lib'
import { ActiveRuleset } from '@reapit-cdk/active-ruleset'

const app = new App()
const stack = new Stack(app, 'stack-name')
const activeRuleset = new ActiveRuleset(stack, 'active-ruleset')
new CfnOutput(stack, 'activeRulesetName', {
  value: activeRuleset.receiptRuleSet.receiptRuleSetName,
})
,```