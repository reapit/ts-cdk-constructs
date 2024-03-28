import { ensureWildcardCertificate, deleteIfUnused } from './ensure-wildcard-certificate'
import { customResourceWrapper } from '@reapit-cdk/custom-resource-wrapper'

const arrayHasChanged = (arr: string[], newArr: string[]): boolean => {
  if (arr.length !== newArr.length) {
    return true
  }

  return JSON.stringify(arr) !== JSON.stringify(newArr)
}

const objectHasChanged = (oldObject: Record<string, string[]>, newObject: Record<string, string[]>): boolean => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { ServiceToken, requestId, ...newObj } = newObject
  return (
    arrayHasChanged(Object.keys(oldObject), Object.keys(newObj)) ||
    Object.keys(oldObject).some((key) => arrayHasChanged(oldObject[key], newObj[key]))
  )
}

const handler = async ({ domainMappings, requestId }: any) => {
  const certificateArn = await ensureWildcardCertificate(requestId, domainMappings)
  return {
    certificateArn,
    physicalResourceId: certificateArn,
  }
}

export const onEvent = customResourceWrapper({
  onCreate: handler,
  onUpdate: (props, oldProps) => {
    if (objectHasChanged(oldProps, props)) {
      return handler(props)
    }
    return
  },
  onDelete: async ({ physicalResourceId }) => {
    if (physicalResourceId) {
      await deleteIfUnused(physicalResourceId)
    }
    return
  },
})
