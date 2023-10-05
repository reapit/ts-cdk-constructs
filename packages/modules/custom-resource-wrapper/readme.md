# @reapit-cdk/custom-resource-wrapper


![npm version](https://img.shields.io/npm/v/@reapit-cdk/custom-resource-wrapper)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/custom-resource-wrapper)
![coverage: 99.02%25](https://img.shields.io/badge/coverage-99.02%25-green)

This module helps write custom resource handlers. It's designed to work with the [Custom Resource Provider Framework](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.CustomResource.html). It accepts an object which contains event handlers for `onCreate`, and optionally, `onUpdate`, and `onDelete`. Anything returned from `onCreate` and `onUpdate` is returned as data attributes on the resulting custom resource.

## Package Installation:

```sh
yarn add --dev @reapit-cdk/custom-resource-wrapper
# or
npm install @reapit-cdk/custom-resource-wrapper --save-dev
```

## Usage
```ts
import { customResourceWrapper } from '@reapit-cdk/custom-resource-wrapper'

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

```