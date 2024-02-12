import {
  ServiceQuotasClient,
  GetServiceQuotaCommand,
  paginateListRequestedServiceQuotaChangeHistoryByQuota,
  RequestedServiceQuotaChange,
  RequestStatus,
  RequestServiceQuotaIncreaseCommand,
  paginateListAWSDefaultServiceQuotas,
  ServiceQuota,
} from '@aws-sdk/client-service-quotas'
import { Config, Quota } from '../types'

export const getCurrentQuotaValue = async (region: string, service: string, quota: string): Promise<number> => {
  const client = new ServiceQuotasClient({
    region,
  })

  const res = await client.send(
    new GetServiceQuotaCommand({
      ServiceCode: service,
      QuotaCode: quota,
    }),
  )

  if (typeof res.Quota?.Value === 'undefined') {
    throw new Error(`Invalid response for ${service}/${quota}`)
  }

  return res.Quota.Value
}

const getRequestedQuotaChanges = async (region: string, service: string, quota: string) => {
  const client = new ServiceQuotasClient({
    region,
  })
  const changes = paginateListRequestedServiceQuotaChangeHistoryByQuota(
    {
      client,
    },
    {
      ServiceCode: service,
      QuotaCode: quota,
    },
  )

  const agg: RequestedServiceQuotaChange[] = []
  for await (const code of changes) {
    agg.push(...(code.RequestedQuotas ?? []))
  }
  return agg
}

const getPendingQuotaValue = async (region: string, service: string, quota: string) => {
  const requestedChanges = await getRequestedQuotaChanges(region, service, quota)
  const requests = requestedChanges.map((value) => {
    if (!value.DesiredValue || !value.Created) {
      throw new Error('invalid quota change request')
    }
    return {
      status: value.Status as RequestStatus,
      value: value.DesiredValue,
      createdAt: value.Created,
    }
  })

  return requests
}

enum Status {
  GRANTED,
  REQUESTED,
  DENIED,
}

const deniedStatuses: string[] = [
  RequestStatus.DENIED,
  RequestStatus.NOT_APPROVED,
  RequestStatus.CASE_CLOSED,
  RequestStatus.INVALID_REQUEST,
]
const pendingStatuses: string[] = [RequestStatus.CASE_OPENED, RequestStatus.PENDING, RequestStatus.APPROVED]

const makeRequest = async (region: string, service: string, quota: string, desiredValue: number) => {
  const client = new ServiceQuotasClient({
    region,
  })

  const res = await client.send(
    new RequestServiceQuotaIncreaseCommand({
      DesiredValue: desiredValue,
      QuotaCode: quota,
      ServiceCode: service,
    }),
  )

  const req = res.RequestedQuota
  if (!req) {
    throw new Error('bad response from RequestServiceQuotaIncreaseCommand')
  }
  return req
}

const getStatus = (status: RequestStatus) => {
  const isDenied = deniedStatuses.includes(status)
  if (isDenied) {
    return Status.DENIED
  }
  const isPending = pendingStatuses.includes(status)
  if (isPending) {
    return Status.REQUESTED
  }

  return Status.GRANTED
}

const createdAtSort = (a: { createdAt: Date }, b: { createdAt: Date }) => {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
}

const dqvCache: Record<string, ServiceQuota[]> = {}

const getDefaultQuotaValues = async (region: string, service: string) => {
  const key = [region, service].join(':')
  if (!dqvCache[key]) {
    const agg: ServiceQuota[] = []
    const client = new ServiceQuotasClient({
      region,
    })
    const defaultQuotas = paginateListAWSDefaultServiceQuotas(
      {
        client,
      },
      {
        ServiceCode: service,
      },
    )
    for await (const quota of defaultQuotas) {
      agg.push(...(quota.Quotas ?? []))
    }
    dqvCache[key] = agg
  }

  return dqvCache[key]
}

const getDefaultQuotaValue = async (region: string, service: string, quota: string) => {
  const agg = await getDefaultQuotaValues(region, service)
  return agg.find((sq) => sq.QuotaCode === quota)?.Value
}

const requestQuota = async (
  { desiredValue, quota, region, service }: Quota,
  { rerequestWhenDenied }: Config,
): Promise<Status> => {
  let currentValue: number | undefined
  try {
    currentValue = await getCurrentQuotaValue(region, service, quota)
  } catch (e) {
    currentValue = await getDefaultQuotaValue(region, service, quota)
  }

  if (typeof currentValue === 'undefined') {
    throw new Error(`unable to get current or default value of quota: ${service}/${quota}`)
  }

  if (desiredValue >= currentValue) {
    const pending = await getPendingQuotaValue(region, service, quota)
    const greaterThan = pending.filter((req) => {
      return req.value >= desiredValue
    })
    greaterThan.sort(createdAtSort)

    if (greaterThan.length) {
      const [mostRecent] = greaterThan
      const status = getStatus(mostRecent.status)
      if (rerequestWhenDenied) {
        if (status !== Status.DENIED) {
          return status
        }
      } else {
        return status
      }
    }

    const requested = await makeRequest(region, service, quota, desiredValue)
    const status = requested.Status
    if (!status) {
      throw new Error('no status returned from request')
    }
    return getStatus(status as RequestStatus)
  }

  return Status.GRANTED
}

type Result = {
  quota: Quota
  status: Status
}

export const requestQuotas = async (quotas: Quota[], config: Config) => {
  const results: Result[] = []

  for (const quota of quotas) {
    const status = await requestQuota(quota, config)
    results.push({
      quota,
      status,
    })
  }

  console.table(
    results.map(({ quota, status }) => ({
      ...quota,
      status,
    })),
  )

  if (config.failIfNotGranted) {
    const notGranted = results.filter((result) => result.status !== Status.GRANTED)
    if (notGranted.length) {
      throw new Error(`config.failIfNotGranted is true, and ${notGranted.length} quotas are not yet granted`)
    }
  }

  return results
}
