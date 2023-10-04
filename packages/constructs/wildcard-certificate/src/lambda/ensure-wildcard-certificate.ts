import {
  ACMClient,
  CertificateSummary,
  DescribeCertificateCommand,
  ListCertificatesCommand,
  RequestCertificateCommand,
  ResourceRecord,
  waitUntilCertificateValidated,
} from '@aws-sdk/client-acm'
import * as crypto from 'crypto'
import { ensureDnsRecords } from './ensure-dns-records'

const client = new ACMClient({})

const ISSUED = 'ISSUED'
const PENDING_VALIDATION = 'PENDING_VALIDATION'

const certIncludesDomainNames = (cert: CertificateSummary, domainNames: string[]): boolean => {
  if (!cert.SubjectAlternativeNameSummaries) {
    return false
  }
  return (
    domainNames.filter((domainName) => {
      return cert.SubjectAlternativeNameSummaries?.includes(domainName)
    }).length === domainNames.length
  )
}

const findCertificates = async (domainNames: string[], NextToken?: string): Promise<CertificateSummary[]> => {
  const certificates = await client.send(
    new ListCertificatesCommand({
      CertificateStatuses: [ISSUED, PENDING_VALIDATION],
      NextToken,
    }),
  )

  const existing =
    certificates.CertificateSummaryList?.filter((cert) => certIncludesDomainNames(cert, domainNames)) ?? []

  if (certificates.NextToken) {
    const next = await findCertificates(domainNames, certificates.NextToken)
    return [...existing, ...next]
  }

  return existing
}

const waitForCert = async (arn: string) => {
  const result = await waitUntilCertificateValidated(
    {
      client,
      maxWaitTime: 5 * 60, // 5 minutes
    },
    {
      CertificateArn: arn,
    },
  )

  if (result.state !== 'SUCCESS') {
    throw new Error(
      `Wait for cert validation returned "${result.state}"${
        result.reason ? ' with no reason given.' : ` with reason: "${result.reason}"`
      }`,
    )
  }

  return arn
}

function isDefined<T>(val: T | undefined | null): val is T {
  return val !== undefined && val !== null
}

export const getDomainValidationRecords = async (arn: string, attempt: number = 0): Promise<ResourceRecord[]> => {
  console.log('getting domain validation record for arn', arn)
  const cert = await client.send(
    new DescribeCertificateCommand({
      CertificateArn: arn,
    }),
  )

  console.log('got', JSON.stringify(cert.Certificate))

  if (cert.Certificate?.DomainValidationOptions) {
    const resourceRecords = cert.Certificate.DomainValidationOptions.map(({ ResourceRecord }) => ResourceRecord).filter(
      isDefined,
    )

    const uniqueResourceRecords = resourceRecords.reduce(
      (acc, cur) => {
        if (cur.Name) {
          acc[cur.Name] = cur
        }
        return acc
      },
      {} as Record<string, ResourceRecord>,
    )

    const rr = Object.keys(uniqueResourceRecords)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => uniqueResourceRecords[key])

    if (rr.length) {
      return rr
    }
  }

  if (attempt >= 10) {
    throw new Error('exceeded max attempts')
  }

  await new Promise((resolve) => setTimeout(resolve, 500))
  return getDomainValidationRecords(arn, attempt + 1)
}

export const ensureWildcardCertificate = async (
  requestId: string,
  domainMappings: { parentDomainName: string; hostedZoneId: string; roleArn?: string }[],
): Promise<string> => {
  const wildcardDomainNames = domainMappings.map(({ parentDomainName }) => `*.${parentDomainName}`)
  console.log('ensureWildcardCert', wildcardDomainNames)
  const existing = await findCertificates(wildcardDomainNames)
  console.log('got existing', JSON.stringify(existing))

  const existingValid = existing.find((cert) => cert.Status === ISSUED)
  if (existingValid?.CertificateArn) {
    console.log('found issued valid existing', existingValid.CertificateArn)
    return existingValid.CertificateArn
  }

  const existingPending = existing.find((cert) => cert.Status === PENDING_VALIDATION)
  if (existingPending?.CertificateArn) {
    console.log('found pending valid existing', existingPending.CertificateArn)
    const resourceRecords = await getDomainValidationRecords(existingPending.CertificateArn)
    console.log('got required dns records', JSON.stringify(resourceRecords))
    await ensureDnsRecords(domainMappings, resourceRecords)
    console.log('added records, waiting for validation')
    return waitForCert(existingPending.CertificateArn)
  }

  console.log('requesting new cert')
  const newCert = await client.send(
    new RequestCertificateCommand({
      DomainName: wildcardDomainNames[0],
      SubjectAlternativeNames: wildcardDomainNames,
      ValidationMethod: 'DNS',
      IdempotencyToken: crypto.createHash('sha256').update(requestId).digest('hex').substring(0, 32),
    }),
  )

  if (newCert.CertificateArn) {
    console.log('requested new cert', newCert.CertificateArn)
    const resourceRecords = await getDomainValidationRecords(newCert.CertificateArn)
    console.log('got required dns records', JSON.stringify(resourceRecords))
    await ensureDnsRecords(domainMappings, resourceRecords)
    console.log('added records, waiting for validation')
    return waitForCert(newCert.CertificateArn)
  }

  console.log(
    JSON.stringify({
      existingValid,
      existingPending,
      newCert,
    }),
  )
  throw new Error('Something went wrong')
}
