import { ensureReplication, deleteReplicas } from './ensure-replication'
import { customResourceWrapper } from '@reapit-cdk/custom-resource-wrapper'

export const onEvent = customResourceWrapper({
  onCreate: ({ keyArn, regions }) => ensureReplication(keyArn, regions),
  onUpdate: ({ keyArn, regions }) => ensureReplication(keyArn, regions),
  onDelete: ({ keyArn, regions }) => deleteReplicas(keyArn, regions),
})
