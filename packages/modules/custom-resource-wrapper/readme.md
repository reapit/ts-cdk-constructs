# @reapit-cdk/custom-resource-wrapper
![npm version](https://img.shields.io/npm/v/@reapit-cdk/custom-resource-wrapper) ![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/custom-resource-wrapper) <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="114" height="20" role="img" aria-label="coverage: 99.02%"><title>coverage: 99.02%</title><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="114" height="20" rx="3" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="61" height="20" fill="#555"/><rect x="61" width="53" height="20" fill="#97ca00"/><rect width="114" height="20" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110"><text aria-hidden="true" x="315" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="510">coverage</text><text x="315" y="140" transform="scale(.1)" fill="#fff" textLength="510">coverage</text><text aria-hidden="true" x="865" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="430">99.02%</text><text x="865" y="140" transform="scale(.1)" fill="#fff" textLength="430">99.02%</text></g></svg>
This module helps write custom resource handlers. It's designed to work with the [Custom Resource Provider Framework](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.CustomResource.html). It accepts an object which contains event handlers for `onCreate`, and optionally, `onUpdate`, and `onDelete`. Anything returned from `onCreate` and `onUpdate` is returned as data attributes on the resulting custom resource.
## Package Installation:
```sh
yarn add --dev undefined
# or
npm install undefined --save-dev
```
## Usage,```ts,import { customResourceWrapper } from '@reapit-cdk/custom-resource-wrapper'

// @ts-expect-error
import { createThing, deleteThing } from './your-module'

export const onEvent = customResourceWrapper({
  onCreate: async ({ aProperty }) => {
    const { aDataAttribute } = await createThing(aProperty)
    return {
      aDataAttribute,
    }
  },
  onUpdate: async ({ aProperty }, oldProps) => {
    if (aProperty !== oldProps.aProperty) {
      await deleteThing(oldProps.aProperty)
      const { aDataAttribute } = await createThing(aProperty)
      return {
        aDataAttribute,
      }
    }
  },
  onDelete: async ({ aProperty }) => {
    await deleteThing(aProperty)
  },
})
,```