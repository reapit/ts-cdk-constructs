import { customResourceWrapper } from '@reapit-cdk/custom-resource-wrapper'

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
