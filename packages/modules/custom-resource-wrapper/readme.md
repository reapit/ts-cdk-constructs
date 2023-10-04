# @reapit-cdk/custom-resource-wrapper

This module helps write custom resource handlers. It's designed to work with the [Custom Resource Provider Framework](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.CustomResource.html).

It accepts an object which contains event handlers for `onCreate`, and optionally, `onUpdate`, and `onDelete`.
Anything returned from `onCreate` and `onUpdate` is returned as data attributes on the resulting custom resource.

## npm Package Installation:
```sh
yarn add @reapit-cdk/custom-resource-wrapper
# or
npm install @reapit-cdk/custom-resource-wrapper
```

## Usage
```ts
import { customResourceWrapper } from '@reapit-cdk/custom-resource-wrapper'

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