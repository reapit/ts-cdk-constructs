export const getAccessToken = async ({
  tenantId,
  clientId,
  clientSecret,
  scopes,
}: {
  tenantId: string
  clientId: string
  clientSecret: string
  scopes?: string[]
}): Promise<string> => {
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    method: 'post',
    body: new URLSearchParams({
      client_id: clientId,
      scope: scopes?.length ? scopes.join(' ') : 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
      client_secret: clientSecret,
    }).toString(),
  })
  if (!res.ok) {
    throw new Error(`microsoft /token call failed with ${res.status}: ${await res.text()}`)
  }
  const { access_token } = await res.json()
  if (!access_token) {
    throw new Error('no access token returned from /token call')
  }
  return access_token
}
