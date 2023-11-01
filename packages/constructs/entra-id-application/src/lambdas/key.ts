import { customResourceWrapper } from '@reapit-cdk/custom-resource-wrapper'
import { createEntraAppKey, deleteEntraAppKey } from './entra-app-key'

export const onEvent = customResourceWrapper({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onCreate: async ({ appId, serviceToken, requestId, validForMsStr, ...keyInfo }) => {
    const key = await createEntraAppKey(appId, keyInfo, validForMsStr)
    return {
      ...key,
      physicalResourceId: JSON.stringify([appId, key.keyId]),
    }
  },
  onDelete: ({ physicalResourceId }) => {
    if (!physicalResourceId) {
      throw new Error('no physicalResourceId present on event')
    }
    const [appId, keyId] = JSON.parse(physicalResourceId)
    return deleteEntraAppKey(appId, keyId)
  },
})
