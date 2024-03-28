export type Quota = {
  region: string
  service: string
  quota: string
  desiredValue: number
}

export interface ServiceQuotasProps {
  readonly rerequestWhenDenied: boolean
  readonly failIfNotGranted: boolean
}
