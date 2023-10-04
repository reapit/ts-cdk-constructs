import { waitForReplication } from './wait-for-replication'
import { customResourceWrapper } from '@reapit-cdk/custom-resource-wrapper'

export const onEvent = customResourceWrapper({
  onCreate: ({ secretArn, regions }) => waitForReplication(secretArn, regions),
  onUpdate: ({ secretArn, regions }) => waitForReplication(secretArn, regions),
})
