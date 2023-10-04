import { ResourceRecord } from '@aws-sdk/client-acm'
import {
  ChangeResourceRecordSetsCommand,
  Route53Client,
  waitUntilResourceRecordSetsChanged,
} from '@aws-sdk/client-route-53'
import { assumeRole } from './assume-role'

export const ensureDnsRecords = async (
  hostedZones: { hostedZoneId: string; parentDomainName: string; roleArn?: string }[],
  records: ResourceRecord[],
) => {
  await Promise.all(
    records.map(async ({ Name, Type, Value }) => {
      const zone =
        Name &&
        hostedZones.find(
          ({ parentDomainName }) => Name.endsWith(parentDomainName) || Name.endsWith(parentDomainName + '.'),
        )
      if (!zone) {
        throw new Error(`Could not find hosted zone for subdomain ${Name} in ${JSON.stringify(hostedZones)}`)
      }
      const { hostedZoneId: HostedZoneId, roleArn } = zone
      console.log('using zone', HostedZoneId, 'for subdomain', Name)
      if (roleArn) {
        console.log('assuming role', roleArn)
      }
      const client = new Route53Client({
        credentials: roleArn ? await assumeRole({ roleArn }) : undefined,
      })

      const Changes = [
        {
          Action: 'UPSERT',
          ResourceRecordSet: {
            Name,
            Type,
            TTL: 60,
            ResourceRecords: [
              {
                Value,
              },
            ],
          },
        },
      ]

      console.log('requesting changes', JSON.stringify(Changes))
      const changeBatch = await client.send(
        new ChangeResourceRecordSetsCommand({
          ChangeBatch: {
            Changes,
          },
          HostedZoneId,
        }),
      )

      if (!changeBatch.ChangeInfo?.Id) {
        throw new Error('Route53 no change batch id to wait for')
      }
      console.log('requested, waiting for propagation')
      await waitUntilResourceRecordSetsChanged(
        { maxWaitTime: 60, client },
        {
          Id: changeBatch.ChangeInfo?.Id,
        },
      )
    }),
  )
}
