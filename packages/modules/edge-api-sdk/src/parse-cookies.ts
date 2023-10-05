export const parseCookies = (cookiesHeader?: string | string[]) => {
  if (!cookiesHeader) {
    return []
  }
  const header = Array.isArray(cookiesHeader) ? cookiesHeader[0] : cookiesHeader
  return header.split(';').map((v) => v.trim())
}
