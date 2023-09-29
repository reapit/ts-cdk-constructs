import { RCQuery } from './types'

export const parseQueryString = (rawQueryString: string): RCQuery => {
  const qs = new URLSearchParams(rawQueryString)
  const obj: RCQuery = {}
  qs.forEach((value, key) => {
    obj[key] = value
  })
  return obj
}
