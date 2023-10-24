import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts'
import { Parameter, SSMClient, paginateGetParametersByPath } from '@aws-sdk/client-ssm'

const getSsmClient = async (region: string, roleArn?: string, sessionName?: string): Promise<SSMClient> => {
  if (roleArn && sessionName) {
    const client = new STSClient({})
    console.log('assuming role', roleArn)
    const res = await client.send(
      new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: sessionName,
      }),
    )
    const { Credentials } = res
    if (!Credentials) {
      throw new Error(`no credentials after assuming role ${roleArn}`)
    }
    const { AccessKeyId, Expiration, SecretAccessKey, SessionToken } = Credentials
    if (!AccessKeyId || !SecretAccessKey) {
      throw new Error(`no AccessKeyId and/or SecretAccessKey after assuming role ${roleArn}`)
    }
    console.log('role assumed', roleArn)
    return new SSMClient({
      region,
      credentials: {
        accessKeyId: AccessKeyId,
        secretAccessKey: SecretAccessKey,
        expiration: Expiration,
        sessionToken: SessionToken,
      },
    })
  }

  if (roleArn && !sessionName) {
    throw new Error('recieved roleArn but no sessionName')
  }

  console.log('no role, not assuming')
  return new SSMClient({
    region,
  })
}

const getPaginatedParams = async (ssmClient: SSMClient, path: string): Promise<Parameter[]> => {
  console.log('getting params from', path)
  const paginator = paginateGetParametersByPath(
    {
      client: ssmClient,
    },
    {
      Path: path,
      Recursive: true,
      WithDecryption: true,
      MaxResults: 100,
    },
  )
  const results = []
  for await (const page of paginator) {
    results.push(...(page.Parameters || []))
    console.log('paging', results.length)
  }
  return results
}

export const getParameters = async (region: string, path: string, roleArn: string, sessionName: string) => {
  const ssmClient = await getSsmClient(region, roleArn, sessionName)

  const params: Record<string, string> = {}
  const results = await getPaginatedParams(ssmClient, path)

  results.forEach(({ Name, Value }) => {
    if (Name && Value) {
      params[Name] = Value
    }
  })

  console.log('done')
  return params
}
