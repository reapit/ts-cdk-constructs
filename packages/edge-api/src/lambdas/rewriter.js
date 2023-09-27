const rewriteCookie = (header, host) => {
  return header
    .split('; ')
    .map((part) => {
      if (part.startsWith('Domain=')) {
        return `Domain=${host}`
      }
      return part
    })
    .join('; ')
}

const domains = []

const rewriteLocationHeader = (location, host) => {
  try {
    const url = new URL(location)
    if (url.hostname !== host && domains.find((domain) => url.hostname.endsWith(domain))) {
      url.hostname = host
    }
    return url.toString()
  } catch (e) {
    console.error(e)
  }
  return location
}

export const handler = async (event) => {
  const req = event.Records[0].cf.request
  const res = event.Records[0].cf.response
  const host = req.headers['host'][0].value
  if (res.headers['set-cookie']) {
    res.headers['set-cookie'] = res.headers['set-cookie'].map(({ key, value }) => ({
      key,
      value: rewriteCookie(value, host),
    }))
  }
  if (res.headers['location']) {
    res.headers['location'][0].value = rewriteLocationHeader(res.headers['location'][0].value, host)
  }
  return res
}
