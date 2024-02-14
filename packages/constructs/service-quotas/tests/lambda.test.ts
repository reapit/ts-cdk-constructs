import {
  ServiceQuotasClient,
  GetServiceQuotaCommand,
  ListRequestedServiceQuotaChangeHistoryByQuotaCommand,
  RequestServiceQuotaIncreaseCommand,
  ListAWSDefaultServiceQuotasCommand,
  RequestStatus,
} from '@aws-sdk/client-service-quotas'
import { mockClient } from 'aws-sdk-client-mock'
import 'aws-sdk-client-mock-jest'

import { onEvent } from '../src/lambda/lambda'
import { Config, Quota } from '../src/types'

const sqMock = mockClient(ServiceQuotasClient)
process.env.TEST = '1'

const genEvent = (
  quotas: Quota[],
  config: Config = {
    failIfNotGranted: false,
    rerequestWhenDenied: false,
  },
): any => ({
  RequestType: 'Create',
  LogicalResourceId: '1q23',
  RequestId: '1q23',
  ResourceProperties: {
    ServiceToken: 'asdf',
    config,
    quotas,
  },
  ResourceType: 'asdf',
  ResponseURL: 'asdf',
  ServiceToken: 'asdf',
  StackId: 'asdf',
})

describe('service-quotas lambda', () => {
  beforeEach(() => {
    sqMock.reset()
  })

  it('should request quotas that havent been requested', async () => {
    sqMock.on(GetServiceQuotaCommand).rejects()
    sqMock.on(ListAWSDefaultServiceQuotasCommand).resolves({
      Quotas: [
        {
          QuotaCode: 'quarks-per-blorb',
          ServiceCode: 'blorbfront',
          Value: 5,
        },
      ],
    })
    sqMock.on(ListRequestedServiceQuotaChangeHistoryByQuotaCommand).resolves({
      RequestedQuotas: [],
    })
    sqMock.on(RequestServiceQuotaIncreaseCommand).resolves({
      RequestedQuota: {
        QuotaCode: 'quarks-per-blorb',
        ServiceCode: 'blorbfront',
        DesiredValue: 10,
        Status: RequestStatus.PENDING,
      },
    })

    await onEvent(
      genEvent([
        {
          desiredValue: 10,
          quota: 'quarks-per-blorb',
          region: 'us-east-1',
          service: 'blorbfront',
        },
      ]),
    )

    expect(sqMock).toHaveReceivedCommandTimes(RequestServiceQuotaIncreaseCommand, 1)
    expect(sqMock).toHaveReceivedCommandWith(RequestServiceQuotaIncreaseCommand, {
      DesiredValue: 10,
      QuotaCode: 'quarks-per-blorb',
      ServiceCode: 'blorbfront',
    })
  })

  it('should request quotas that have been requested but not enough', async () => {
    sqMock.on(GetServiceQuotaCommand).resolves({
      Quota: {
        QuotaCode: 'quarks-per-blorb',
        ServiceCode: 'blorbfront',
        Value: 10,
      },
    })
    sqMock.on(ListAWSDefaultServiceQuotasCommand).resolves({
      Quotas: [
        {
          QuotaCode: 'quarks-per-blorb',
          ServiceCode: 'blorbfront',
          Value: 5,
        },
      ],
    })
    sqMock.on(ListRequestedServiceQuotaChangeHistoryByQuotaCommand).resolves({
      RequestedQuotas: [],
    })
    sqMock.on(RequestServiceQuotaIncreaseCommand).resolves({
      RequestedQuota: {
        QuotaCode: 'quarks-per-blorb',
        ServiceCode: 'blorbfront',
        DesiredValue: 15,
        Status: RequestStatus.PENDING,
      },
    })

    await onEvent(
      genEvent([
        {
          desiredValue: 15,
          quota: 'quarks-per-blorb',
          region: 'us-east-1',
          service: 'blorbfront',
        },
      ]),
    )

    expect(sqMock).toHaveReceivedCommandTimes(RequestServiceQuotaIncreaseCommand, 1)
    expect(sqMock).toHaveReceivedCommandWith(RequestServiceQuotaIncreaseCommand, {
      DesiredValue: 15,
      QuotaCode: 'quarks-per-blorb',
      ServiceCode: 'blorbfront',
    })
  })

  it('should not request quotas that have already been granted higher', async () => {
    sqMock.on(GetServiceQuotaCommand).resolves({
      Quota: {
        QuotaCode: 'quarks-per-blorb',
        ServiceCode: 'blorbfront',
        Value: 50,
      },
    })
    sqMock.on(ListAWSDefaultServiceQuotasCommand).resolves({
      Quotas: [
        {
          QuotaCode: 'quarks-per-blorb',
          ServiceCode: 'blorbfront',
          Value: 5,
        },
      ],
    })
    sqMock.on(ListRequestedServiceQuotaChangeHistoryByQuotaCommand).resolves({
      RequestedQuotas: [],
    })
    sqMock.on(RequestServiceQuotaIncreaseCommand).resolves({
      RequestedQuota: {
        QuotaCode: 'quarks-per-blorb',
        ServiceCode: 'blorbfront',
        DesiredValue: 25,
        Status: RequestStatus.PENDING,
      },
    })

    await onEvent(
      genEvent([
        {
          desiredValue: 25,
          quota: 'quarks-per-blorb',
          region: 'us-east-1',
          service: 'blorbfront',
        },
      ]),
    )

    expect(sqMock).toHaveReceivedCommandTimes(RequestServiceQuotaIncreaseCommand, 0)
  })

  it('should not request quotas that have already been granted higher default', async () => {
    sqMock.on(GetServiceQuotaCommand).rejects()
    sqMock.on(ListAWSDefaultServiceQuotasCommand).resolves({
      Quotas: [
        {
          QuotaCode: 'quarks-per-blorb',
          ServiceCode: 'blorbfront',
          Value: 50,
        },
      ],
    })
    sqMock.on(ListRequestedServiceQuotaChangeHistoryByQuotaCommand).resolves({
      RequestedQuotas: [],
    })
    sqMock.on(RequestServiceQuotaIncreaseCommand).resolves({
      RequestedQuota: {
        QuotaCode: 'quarks-per-blorb',
        ServiceCode: 'blorbfront',
        DesiredValue: 25,
        Status: RequestStatus.PENDING,
      },
    })

    await onEvent(
      genEvent([
        {
          desiredValue: 25,
          quota: 'quarks-per-blorb',
          region: 'us-east-1',
          service: 'blorbfront',
        },
      ]),
    )

    expect(sqMock).toHaveReceivedCommandTimes(RequestServiceQuotaIncreaseCommand, 0)
  })

  it('should re-request denied quotas if config setting is true', async () => {
    sqMock.on(GetServiceQuotaCommand).rejects()
    sqMock.on(ListAWSDefaultServiceQuotasCommand).resolves({
      Quotas: [
        {
          QuotaCode: 'quarks-per-blorb',
          ServiceCode: 'blorbfront',
          Value: 5,
        },
      ],
    })
    sqMock.on(ListRequestedServiceQuotaChangeHistoryByQuotaCommand).resolves({
      RequestedQuotas: [
        {
          DesiredValue: 15,
          Status: RequestStatus.DENIED,
          Created: new Date(),
        },
      ],
    })
    sqMock.on(RequestServiceQuotaIncreaseCommand).resolves({
      RequestedQuota: {
        QuotaCode: 'quarks-per-blorb',
        ServiceCode: 'blorbfront',
        DesiredValue: 10,
        Status: RequestStatus.PENDING,
      },
    })

    await onEvent(
      genEvent(
        [
          {
            desiredValue: 10,
            quota: 'quarks-per-blorb',
            region: 'us-east-1',
            service: 'blorbfront',
          },
        ],
        {
          rerequestWhenDenied: true,
          failIfNotGranted: false,
        },
      ),
    )

    expect(sqMock).toHaveReceivedCommandTimes(RequestServiceQuotaIncreaseCommand, 1)
    expect(sqMock).toHaveReceivedCommandWith(RequestServiceQuotaIncreaseCommand, {
      DesiredValue: 10,
      QuotaCode: 'quarks-per-blorb',
      ServiceCode: 'blorbfront',
    })
  })

  it('should fail if not granted if failIfNotGranted config setting is true', async () => {
    sqMock.on(GetServiceQuotaCommand).rejects()
    sqMock.on(ListAWSDefaultServiceQuotasCommand).resolves({
      Quotas: [
        {
          QuotaCode: 'quarks-per-blorb',
          ServiceCode: 'blorbfront',
          Value: 5,
        },
      ],
    })
    sqMock.on(ListRequestedServiceQuotaChangeHistoryByQuotaCommand).resolves({
      RequestedQuotas: [],
    })
    sqMock.on(RequestServiceQuotaIncreaseCommand).resolves({
      RequestedQuota: {
        QuotaCode: 'quarks-per-blorb',
        ServiceCode: 'blorbfront',
        DesiredValue: 10,
        Status: RequestStatus.PENDING,
      },
    })

    const res = await onEvent(
      genEvent(
        [
          {
            desiredValue: 10,
            quota: 'quarks-per-blorb',
            region: 'us-east-1',
            service: 'blorbfront',
          },
        ],
        {
          rerequestWhenDenied: false,
          failIfNotGranted: true,
        },
      ),
    )
    expect(res.Status).toBe('FAILED')
    expect(res.Reason?.split('Error:')[1].split('\n')[0].trim()).toBe(
      'config.failIfNotGranted is true, and 1 quotas are not yet granted',
    )
  })

  it('should fail if not granted if failIfNotGranted config setting is true - existing request', async () => {
    sqMock.on(GetServiceQuotaCommand).rejects()
    sqMock.on(ListAWSDefaultServiceQuotasCommand).resolves({
      Quotas: [
        {
          QuotaCode: 'quarks-per-blorb',
          ServiceCode: 'blorbfront',
          Value: 5,
        },
      ],
    })

    sqMock.on(ListRequestedServiceQuotaChangeHistoryByQuotaCommand).resolves({
      RequestedQuotas: [
        {
          QuotaCode: 'quarks-per-blorb',
          ServiceCode: 'blorbfront',
          DesiredValue: 15,
          Status: RequestStatus.PENDING,
          Created: new Date(),
        },
      ],
    })

    sqMock.on(RequestServiceQuotaIncreaseCommand).resolves({
      RequestedQuota: {
        QuotaCode: 'quarks-per-blorb',
        ServiceCode: 'blorbfront',
        DesiredValue: 10,
        Status: RequestStatus.PENDING,
      },
    })

    const res = await onEvent(
      genEvent(
        [
          {
            desiredValue: 10,
            quota: 'quarks-per-blorb',
            region: 'us-east-1',
            service: 'blorbfront',
          },
        ],
        {
          rerequestWhenDenied: false,
          failIfNotGranted: true,
        },
      ),
    )

    expect(res.Status).toBe('FAILED')
    expect(res.Reason?.split('Error:')[1].split('\n')[0].trim()).toBe(
      'config.failIfNotGranted is true, and 1 quotas are not yet granted',
    )

    expect(sqMock).toHaveReceivedCommandTimes(RequestServiceQuotaIncreaseCommand, 0)
  })

  it('should not fail if not granted if failIfNotGranted config setting is false', async () => {
    sqMock.on(GetServiceQuotaCommand).rejects()
    sqMock.on(ListAWSDefaultServiceQuotasCommand).resolves({
      Quotas: [
        {
          QuotaCode: 'quarks-per-blorb',
          ServiceCode: 'blorbfront',
          Value: 5,
        },
      ],
    })
    sqMock.on(ListRequestedServiceQuotaChangeHistoryByQuotaCommand).resolves({
      RequestedQuotas: [],
    })
    sqMock.on(RequestServiceQuotaIncreaseCommand).resolves({
      RequestedQuota: {
        QuotaCode: 'quarks-per-blorb',
        ServiceCode: 'blorbfront',
        DesiredValue: 10,
        Status: RequestStatus.PENDING,
      },
    })

    const res = await onEvent(
      genEvent([
        {
          desiredValue: 10,
          quota: 'quarks-per-blorb',
          region: 'us-east-1',
          service: 'blorbfront',
        },
      ]),
    )

    expect(res.Status).toBe('SUCCESS')
  })
})
