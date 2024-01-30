import {
  ServiceInfo,
  ServiceQuotasClient,
  paginateListServices,
  paginateListServiceQuotas,
  ServiceQuota,
  AppliedLevelEnum,
  paginateListAWSDefaultServiceQuotas,
} from '@aws-sdk/client-service-quotas'
import * as varname from 'varname'
import * as fs from 'fs/promises'
import * as path from 'path'

const client = new ServiceQuotasClient({
  region: 'us-east-1',
})

const getServiceCodes = async (): Promise<ServiceInfo[]> => {
  const codes = paginateListServices(
    {
      client,
    },
    {
      MaxResults: 100,
    },
  )
  const agg: ServiceInfo[] = []
  for await (const code of codes) {
    agg.push(...(code.Services || []))
  }
  return agg
}

const getServiceQuotas = async (ServiceCode: string) => {
  const quotas = paginateListServiceQuotas(
    {
      client,
    },
    {
      ServiceCode,
      QuotaAppliedAtLevel: AppliedLevelEnum.ALL,
    },
  )
  const agg: ServiceQuota[] = []
  for await (const quota of quotas) {
    agg.push(...(quota.Quotas || []))
  }

  const defaultQuotas = paginateListAWSDefaultServiceQuotas(
    {
      client,
    },
    {
      ServiceCode,
    },
  )
  for await (const quota of defaultQuotas) {
    agg.push(...(quota.Quotas || []))
  }
  return agg
}

const varifyName = (name: string) => varname.camelcase(name)

const enumify = (name: string, code: string) => {
  return `${varifyName(name)} = '${code}'`
}

type QuotaPair = {
  code: string
  name: string
}

type NestedQuotaPair = QuotaPair & {
  quotas: QuotaPair[]
}

const tsify = (quotas: NestedQuotaPair[]) => {
  return `
  ${quotas
    .map(({ name, quotas }) => {
      return `export enum ${varifyName(name)}Quota {
        ${unq(quotas)
          .map(({ name, code }) => {
            return enumify(name, code)
          })
          .join(',\n')}
      }`
    })
    .join('\n')}
  export enum AWSService {
    ${quotas
      .map(({ name, code }) => {
        return enumify(name, code)
      })
      .join(',\n')}
  }
  export type ServiceQuotaMap = {
    ${quotas
      .map(({ name, code }) => {
        return `'${code}': ${varifyName(name)}Quota`
      })
      .join(',\n')}
  } 
  
  `
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const unq = (qps: QuotaPair[]): QuotaPair[] => {
  const unqNames = [...new Set(qps.map((qp) => varifyName(qp.name)))]
  return unqNames.map((name) => {
    return qps.find((qp) => varifyName(qp.name) === name)
  }) as QuotaPair[]
}

const getAll = async (): Promise<NestedQuotaPair[]> => {
  const serviceCodes = await getServiceCodes()

  const toReturn: NestedQuotaPair[] = []

  for (let i = 0; i < serviceCodes.length; i++) {
    const { ServiceCode, ServiceName } = serviceCodes[i]
    if (!ServiceCode) {
      throw new Error('found service without code, ServiceName: ' + ServiceName)
    }
    const serviceQuotas = await getServiceQuotas(ServiceCode)

    toReturn.push({
      name: ServiceName || '',
      code: ServiceCode,
      quotas: serviceQuotas.map(
        ({ QuotaCode, QuotaName }): QuotaPair => ({
          code: QuotaCode || '',
          name: QuotaName || '',
        }),
      ),
    })

    await wait(10)
    console.log(i, '/', serviceCodes.length)
  }

  return toReturn
}

const go = async () => {
  const all = await getAll()
  await fs.writeFile('quotas.json', JSON.stringify(all, null, '\t'))
  await output(all)
}

// const goCached = async () => {
//   const all = JSON.parse(await fs.readFile('quotas.json', 'utf-8'))
//   await output(all)
// }

const output = async (all: NestedQuotaPair[]) => {
  await fs.writeFile(path.resolve(__dirname, 'quotas.ts'), tsify(all))
}

go().catch((e) => {
  console.error(e)
  process.exit(1)
})
