import { RCQuery } from './types'

export const parseQueryString = (rawQueryString: string): RCQuery | undefined => {
  const qs = new URLSearchParams(rawQueryString)
  const obj: RCQuery = {}
  qs.forEach((value, key) => {
    obj[key] = value
  })
  if (Object.keys(obj).length) {
    return obj
  }
}
