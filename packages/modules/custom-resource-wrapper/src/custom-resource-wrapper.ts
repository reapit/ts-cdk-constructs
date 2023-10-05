import {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceFailedResponse,
  CloudFormationCustomResourceResponse,
  CloudFormationCustomResourceSuccessResponse,
  CloudFormationCustomResourceUpdateEvent,
} from 'aws-lambda'

const successEvent = (
  event: CloudFormationCustomResourceEvent,
  { data }: { data?: OptionalData },
): CloudFormationCustomResourceSuccessResponse => {
  const { physicalResourceId, ...rest } = (data as any) ?? {} // TODO: not use any here
  const restData = Object.keys(rest).length ? rest : undefined

  return {
    ...event,
    Status: 'SUCCESS',
    Data: restData,
    PhysicalResourceId: physicalResourceId ?? (event as any).PhysicalResourceId ?? event.LogicalResourceId,
  }
}

const failureEvent = (
  event: CloudFormationCustomResourceEvent,
  { reason }: { reason: string },
): CloudFormationCustomResourceFailedResponse => {
  return {
    ...event,
    Status: 'FAILED',
    Reason: reason,
    PhysicalResourceId: (event as any).PhysicalResourceId || event.LogicalResourceId,
  }
}

const errToString = (e: Error) => {
  return `[${e.name}] ${e.message}: ${e.stack}`
}

type OptionalData = Record<string, any> | undefined | void
type Properties = Record<string, any> & { serviceToken: string; requestId: string }

type CreateHandler = (properties: Properties) => OptionalData | Promise<OptionalData>
type UpdateHandler = (
  properties: Properties,
  oldProperties: CloudFormationCustomResourceUpdateEvent['OldResourceProperties'],
) => OptionalData | Promise<OptionalData>
type DeleteHandler = (properties: Properties) => void | Promise<void>

type Handler = {
  onCreate: CreateHandler
  onUpdate?: UpdateHandler
  onDelete?: DeleteHandler
}

export const customResourceWrapper = (handler: Handler) => {
  return async (event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceResponse> => {
    console.log(JSON.stringify(event))
    const { ServiceToken, ...rp } = event.ResourceProperties
    const augmentedRP = {
      ...rp,
      requestId: event.RequestId,
      serviceToken: ServiceToken,
    }
    try {
      switch (event.RequestType) {
        case 'Create': {
          const data = await handler.onCreate(augmentedRP)
          return successEvent(event, { data })
        }
        case 'Delete': {
          if (handler.onDelete) {
            await handler.onDelete(augmentedRP)
          }
          return successEvent(event, {})
        }
        case 'Update': {
          if (handler.onUpdate) {
            const data = await handler.onUpdate(augmentedRP, event.OldResourceProperties)
            return successEvent(event, { data: data })
          }
          return successEvent(event, {})
        }
      }
    } catch (e) {
      console.error(e)
      return failureEvent(event, { reason: errToString(e as Error) })
    }
  }
}
