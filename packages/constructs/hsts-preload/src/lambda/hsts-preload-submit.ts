import { Issues, Status } from './types'

const hstsPreloadFetch = async (endpoint: string, domain: string, method: string = 'get') => {
  const res = await fetch(`https://hstspreload.org/api/v2/${endpoint}?${new URLSearchParams({ domain }).toString()}`, {
    method,
  })
  if (!res.ok) {
    throw new Error('hstspreload.org request error: ' + endpoint + ' ' + res.status + ' - ' + (await res.text()))
  }
  return res.json()
}

export const getStatus = async (domain: string): Promise<Status> => {
  return hstsPreloadFetch('status', domain)
}

export const getPreloadable = async (domain: string): Promise<Issues> => {
  return hstsPreloadFetch('preloadable', domain)
}

export const getRemovable = async (domain: string): Promise<Issues> => {
  return hstsPreloadFetch('removable', domain)
}

export const submitDomain = async (domain: string): Promise<Issues> => {
  return hstsPreloadFetch('submit', domain)
}

export const removeDomain = async (domain: string): Promise<Issues> => {
  return hstsPreloadFetch('remove', domain)
}
