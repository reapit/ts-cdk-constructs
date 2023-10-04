import { waitForReplication } from './wait-for-replication'
import { customResourceWrapper } from '../../../../libs/custom-resource-wrapper/src'

export const onEvent = customResourceWrapper({
  onCreate: ({ secretArn, regions }) => waitForReplication(secretArn, regions),
  onUpdate: ({ secretArn, regions }) => waitForReplication(secretArn, regions),
})
