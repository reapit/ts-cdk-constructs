export enum StatusStatus {
  StatusUnknown = 'unknown',
  StatusPending = 'pending',
  StatusPreloaded = 'preloaded',
  StatusRejected = 'rejected',
  StatusRemoved = 'removed',
  StatusPendingRemoval = 'pending-removal',
  StatusPendingAutomatedRemoval = 'pending-automated-removal',
}

export type Status = {
  name: string
  status: StatusStatus
  bulk: boolean
  preloadedDomain: string
}

export type Issue = {
  code: string
  summary: string
  message: string
}

export type Issues = {
  errors: Issue[]
  warnings: Issue[]
}
