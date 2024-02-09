export type Quota = {
  region: string
  service: string
  quota: string
  desiredValue: number
}

export type Config = {
  rerequestWhenDenied: boolean
  failIfNotGranted: boolean
}
