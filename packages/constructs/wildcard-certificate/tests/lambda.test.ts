import { mockClient } from 'aws-sdk-client-mock'
import 'aws-sdk-client-mock-jest'
import {
  ACMClient,
  ListCertificatesCommand,
  RequestCertificateCommand,
  DescribeCertificateCommand,
  DeleteCertificateCommand,
} from '@aws-sdk/client-acm'
import { ChangeResourceRecordSetsCommand, GetChangeCommand, Route53Client } from '@aws-sdk/client-route-53'
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts'

import { onEvent } from '../src/lambda/lambda'

const acmMock = mockClient(ACMClient)
const route53Mock = mockClient(Route53Client)
const stsMock = mockClient(STSClient)

const genEvent = (
  RequestType: string = 'Create',
  domainMappings: any[] = [
    {
      parentDomainName: 'asdf.com',
      hostedZoneId: '123',
    },
    {
      parentDomainName: 'qwerty.com',
      hostedZoneId: '456',
    },
  ],
  oldDomainMappings: any[] = [],
): any => ({
  RequestType,
  LogicalResourceId: '123',
  RequestId: '123',
  PhysicalResourceId: 'physical-resource-id',
  ResourceProperties: {
    ServiceToken: '123',
    domainMappings,
  },
  OldResourceProperties: {
    domainMappings: oldDomainMappings,
  },
  ResourceType: 'asdf',
  ResponseURL: 'asdf',
  ServiceToken: 'asdf',
  StackId: 'asdf',
})

describe('wildcard-certificate', () => {
  beforeEach(() => {
    acmMock.reset()
    route53Mock.reset()
    stsMock.reset()
  })

  it('should request certificates and validate them and return the cert arn as Data', async () => {
    acmMock.on(ListCertificatesCommand).resolves({
      CertificateSummaryList: [],
    })
    acmMock.on(RequestCertificateCommand).resolves({
      CertificateArn: 'cert-arn',
    })
    acmMock.on(DescribeCertificateCommand).resolves({
      Certificate: {
        DomainValidationOptions: [
          {
            ValidationStatus: 'SUCCESS',
            DomainName: '',
            ResourceRecord: {
              Name: 'first-record-name.asdf.com',
              Type: 'CNAME',
              Value: 'first-record-value',
            },
          },
          {
            ValidationStatus: 'SUCCESS',
            DomainName: '',
            ResourceRecord: {
              Name: 'second-record-name.qwerty.com',
              Type: 'CNAME',
              Value: 'second-record-value',
            },
          },
        ],
      },
    })

    route53Mock.on(ChangeResourceRecordSetsCommand).resolves({
      ChangeInfo: {
        Id: 'change-batch-id',
        Status: 'INSYNC',
        SubmittedAt: new Date(),
      },
    })

    route53Mock.on(GetChangeCommand).resolves({
      ChangeInfo: {
        Id: 'change-batch-id',
        Status: 'INSYNC',
        SubmittedAt: new Date(),
      },
    })

    const result = await onEvent(genEvent())

    expect(acmMock).toHaveReceivedCommandWith(RequestCertificateCommand, {
      DomainName: '*.asdf.com',
      SubjectAlternativeNames: ['*.asdf.com', '*.qwerty.com'],
    })

    expect(route53Mock).toHaveReceivedCommandWith(ChangeResourceRecordSetsCommand, {
      HostedZoneId: '123',
      ChangeBatch: {
        Changes: [
          {
            Action: 'UPSERT',
            ResourceRecordSet: {
              Name: 'first-record-name.asdf.com',
              Type: 'CNAME',
              TTL: 60,
              ResourceRecords: [
                {
                  Value: 'first-record-value',
                },
              ],
            },
          },
        ],
      },
    })

    expect(route53Mock).toHaveReceivedCommandWith(ChangeResourceRecordSetsCommand, {
      HostedZoneId: '456',
      ChangeBatch: {
        Changes: [
          {
            Action: 'UPSERT',
            ResourceRecordSet: {
              Name: 'second-record-name.qwerty.com',
              Type: 'CNAME',
              TTL: 60,
              ResourceRecords: [
                {
                  Value: 'second-record-value',
                },
              ],
            },
          },
        ],
      },
    })

    if (!result.Data) {
      throw new Error('no result data')
    }
    expect(result.Data).toBeDefined()
    expect(result.Data).toHaveProperty('certificateArn')
    expect(result.Data.certificateArn).toBe('cert-arn')
  })

  it('should include the parent domain in the cert if told to', async () => {
    acmMock.on(ListCertificatesCommand).resolves({
      CertificateSummaryList: [],
    })
    acmMock.on(RequestCertificateCommand).resolves({
      CertificateArn: 'cert-arn',
    })
    acmMock.on(DescribeCertificateCommand).resolves({
      Certificate: {
        DomainValidationOptions: [
          {
            ValidationStatus: 'SUCCESS',
            DomainName: '',
            ResourceRecord: {
              Name: 'first-record-name.asdf.com',
              Type: 'CNAME',
              Value: 'first-record-value',
            },
          },
          {
            ValidationStatus: 'SUCCESS',
            DomainName: '',
            ResourceRecord: {
              Name: 'second-record-name.qwerty.com',
              Type: 'CNAME',
              Value: 'second-record-value',
            },
          },
        ],
      },
    })

    route53Mock.on(ChangeResourceRecordSetsCommand).resolves({
      ChangeInfo: {
        Id: 'change-batch-id',
        Status: 'INSYNC',
        SubmittedAt: new Date(),
      },
    })

    route53Mock.on(GetChangeCommand).resolves({
      ChangeInfo: {
        Id: 'change-batch-id',
        Status: 'INSYNC',
        SubmittedAt: new Date(),
      },
    })

    const result = await onEvent(
      genEvent('Create', [
        {
          parentDomainName: 'asdf.com',
          hostedZoneId: '123',
          includeParent: true,
        },
        {
          parentDomainName: 'qwerty.com',
          hostedZoneId: '456',
          includeParent: true,
        },
      ]),
    )

    expect(acmMock).toHaveReceivedCommandWith(RequestCertificateCommand, {
      DomainName: 'asdf.com',
      SubjectAlternativeNames: ['asdf.com', '*.asdf.com', 'qwerty.com', '*.qwerty.com'],
    })

    if (!result.Data) {
      throw new Error('no result data')
    }
    expect(result.Data).toBeDefined()
    expect(result.Data).toHaveProperty('certificateArn')
    expect(result.Data.certificateArn).toBe('cert-arn')
  })

  it('should return a cert if it already exists', async () => {
    acmMock.on(ListCertificatesCommand).resolves({
      CertificateSummaryList: [
        {
          CertificateArn: 'existing-cert-arn',
          DomainName: '*.qwerty.com',
          SubjectAlternativeNameSummaries: ['*.qwerty.com', '*.asdf.com'],
          Status: 'ISSUED',
        },
      ],
    })

    const result = await onEvent(genEvent())

    if (!result.Data) {
      throw new Error('no result data')
    }
    expect(result.Data).toBeDefined()
    expect(result.Data).toHaveProperty('certificateArn')
    expect(result.Data.certificateArn).toBe('existing-cert-arn')
  })

  it('should add the dns records for a pending cert if it already exists', async () => {
    acmMock.on(ListCertificatesCommand).resolves({
      CertificateSummaryList: [
        {
          CertificateArn: 'existing-cert-arn',
          DomainName: '*.qwerty.com',
          SubjectAlternativeNameSummaries: ['*.qwerty.com', '*.asdf.com'],
          Status: 'PENDING_VALIDATION',
        },
      ],
    })

    acmMock.on(DescribeCertificateCommand).resolves({
      Certificate: {
        DomainValidationOptions: [
          {
            ValidationStatus: 'SUCCESS',
            DomainName: '',
            ResourceRecord: {
              Name: 'first-record-name.asdf.com',
              Type: 'CNAME',
              Value: 'first-record-value',
            },
          },
          {
            ValidationStatus: 'SUCCESS',
            DomainName: '',
            ResourceRecord: {
              Name: 'second-record-name.qwerty.com',
              Type: 'CNAME',
              Value: 'second-record-value',
            },
          },
        ],
      },
    })

    route53Mock.on(ChangeResourceRecordSetsCommand).resolves({
      ChangeInfo: {
        Id: 'change-batch-id',
        Status: 'INSYNC',
        SubmittedAt: new Date(),
      },
    })

    route53Mock.on(GetChangeCommand).resolves({
      ChangeInfo: {
        Id: 'change-batch-id',
        Status: 'INSYNC',
        SubmittedAt: new Date(),
      },
    })

    const result = await onEvent(genEvent())

    if (!result.Data) {
      throw new Error('no result data')
    }
    expect(result.Data).toBeDefined()
    expect(result.Data).toHaveProperty('certificateArn')
    expect(result.Data.certificateArn).toBe('existing-cert-arn')

    expect(route53Mock).toHaveReceivedCommandWith(ChangeResourceRecordSetsCommand, {
      HostedZoneId: '123',
      ChangeBatch: {
        Changes: [
          {
            Action: 'UPSERT',
            ResourceRecordSet: {
              Name: 'first-record-name.asdf.com',
              Type: 'CNAME',
              TTL: 60,
              ResourceRecords: [
                {
                  Value: 'first-record-value',
                },
              ],
            },
          },
        ],
      },
    })

    expect(route53Mock).toHaveReceivedCommandWith(ChangeResourceRecordSetsCommand, {
      HostedZoneId: '456',
      ChangeBatch: {
        Changes: [
          {
            Action: 'UPSERT',
            ResourceRecordSet: {
              Name: 'second-record-name.qwerty.com',
              Type: 'CNAME',
              TTL: 60,
              ResourceRecords: [
                {
                  Value: 'second-record-value',
                },
              ],
            },
          },
        ],
      },
    })

    expect(acmMock).not.toHaveReceivedCommand(RequestCertificateCommand)
  })

  it('should create a new cert if the resource properties change', async () => {
    acmMock.on(ListCertificatesCommand).resolves({
      CertificateSummaryList: [],
    })
    acmMock.on(RequestCertificateCommand).resolves({
      CertificateArn: 'cert-arn',
    })
    acmMock.on(DescribeCertificateCommand).resolves({
      Certificate: {
        DomainValidationOptions: [
          {
            ValidationStatus: 'SUCCESS',
            DomainName: '',
            ResourceRecord: {
              Name: 'first-record-name.asdf.com',
              Type: 'CNAME',
              Value: 'first-record-value',
            },
          },
          {
            ValidationStatus: 'SUCCESS',
            DomainName: '',
            ResourceRecord: {
              Name: 'second-record-name.qwerty.com',
              Type: 'CNAME',
              Value: 'second-record-value',
            },
          },
        ],
      },
    })

    route53Mock.on(ChangeResourceRecordSetsCommand).resolves({
      ChangeInfo: {
        Id: 'change-batch-id',
        Status: 'INSYNC',
        SubmittedAt: new Date(),
      },
    })

    route53Mock.on(GetChangeCommand).resolves({
      ChangeInfo: {
        Id: 'change-batch-id',
        Status: 'INSYNC',
        SubmittedAt: new Date(),
      },
    })
    const result = await onEvent(
      genEvent(
        'Update',
        [
          {
            parentDomainName: 'asdf.com',
            hostedZoneId: '123',
          },
          {
            parentDomainName: 'qwerty.com',
            hostedZoneId: '456',
          },
        ],
        [
          {
            parentDomainName: 'asdf.com',
            hostedZoneId: '234',
          },
          {
            parentDomainName: 'qwerty.com',
            hostedZoneId: '456',
          },
        ],
      ),
    )

    expect(acmMock).toHaveReceivedCommandWith(RequestCertificateCommand, {
      DomainName: '*.asdf.com',
      SubjectAlternativeNames: ['*.asdf.com', '*.qwerty.com'],
    })

    expect(route53Mock).toHaveReceivedCommandWith(ChangeResourceRecordSetsCommand, {
      HostedZoneId: '123',
      ChangeBatch: {
        Changes: [
          {
            Action: 'UPSERT',
            ResourceRecordSet: {
              Name: 'first-record-name.asdf.com',
              Type: 'CNAME',
              TTL: 60,
              ResourceRecords: [
                {
                  Value: 'first-record-value',
                },
              ],
            },
          },
        ],
      },
    })

    expect(route53Mock).toHaveReceivedCommandWith(ChangeResourceRecordSetsCommand, {
      HostedZoneId: '456',
      ChangeBatch: {
        Changes: [
          {
            Action: 'UPSERT',
            ResourceRecordSet: {
              Name: 'second-record-name.qwerty.com',
              Type: 'CNAME',
              TTL: 60,
              ResourceRecords: [
                {
                  Value: 'second-record-value',
                },
              ],
            },
          },
        ],
      },
    })

    if (!result.Data) {
      throw new Error('no result data')
    }
    expect(result.Data).toBeDefined()
    expect(result.Data).toHaveProperty('certificateArn')
    expect(result.Data.certificateArn).toBe('cert-arn')
  })

  it("should not do anything if the resource properties don't change", async () => {
    await onEvent(
      genEvent(
        'Update',
        [
          {
            parentDomainName: 'asdf.com',
            hostedZoneId: '123',
          },
          {
            parentDomainName: 'qwerty.com',
            hostedZoneId: '456',
          },
        ],
        [
          {
            parentDomainName: 'asdf.com',
            hostedZoneId: '123',
          },
          {
            parentDomainName: 'qwerty.com',
            hostedZoneId: '456',
          },
        ],
      ),
    )
  })

  it('should not do anything on delete', async () => {
    // this will fail if it attempts any SDK commands as the mocks aren't set up
    await onEvent(genEvent('Delete'))
  })

  it('should handle cross-region DNS changes', async () => {
    stsMock.on(AssumeRoleCommand).resolves({
      Credentials: {
        AccessKeyId: 'key-id',
        SecretAccessKey: 'key-secret',
        SessionToken: 'session-token',
        Expiration: new Date(),
      },
    })
    acmMock.on(ListCertificatesCommand).resolves({
      CertificateSummaryList: [],
    })
    acmMock.on(RequestCertificateCommand).resolves({
      CertificateArn: 'cert-arn',
    })
    acmMock.on(DescribeCertificateCommand).resolves({
      Certificate: {
        DomainValidationOptions: [
          {
            ValidationStatus: 'SUCCESS',
            DomainName: '',
            ResourceRecord: {
              Name: 'first-record-name.asdf.com',
              Type: 'CNAME',
              Value: 'first-record-value',
            },
          },
          {
            ValidationStatus: 'SUCCESS',
            DomainName: '',
            ResourceRecord: {
              Name: 'second-record-name.qwerty.com',
              Type: 'CNAME',
              Value: 'second-record-value',
            },
          },
        ],
      },
    })

    route53Mock.on(ChangeResourceRecordSetsCommand).resolves({
      ChangeInfo: {
        Id: 'change-batch-id',
        Status: 'INSYNC',
        SubmittedAt: new Date(),
      },
    })

    route53Mock.on(GetChangeCommand).resolves({
      ChangeInfo: {
        Id: 'change-batch-id',
        Status: 'INSYNC',
        SubmittedAt: new Date(),
      },
    })

    const result = await onEvent(
      genEvent('Create', [
        {
          parentDomainName: 'asdf.com',
          hostedZoneId: '123',
        },
        {
          parentDomainName: 'qwerty.com',
          hostedZoneId: '456',
          roleArn: 'role-arn',
        },
      ]),
    )

    expect(acmMock).toHaveReceivedCommandWith(RequestCertificateCommand, {
      DomainName: '*.asdf.com',
      SubjectAlternativeNames: ['*.asdf.com', '*.qwerty.com'],
    })

    expect(route53Mock).toHaveReceivedCommandWith(ChangeResourceRecordSetsCommand, {
      HostedZoneId: '123',
      ChangeBatch: {
        Changes: [
          {
            Action: 'UPSERT',
            ResourceRecordSet: {
              Name: 'first-record-name.asdf.com',
              Type: 'CNAME',
              TTL: 60,
              ResourceRecords: [
                {
                  Value: 'first-record-value',
                },
              ],
            },
          },
        ],
      },
    })

    expect(route53Mock).toHaveReceivedCommandWith(ChangeResourceRecordSetsCommand, {
      HostedZoneId: '456',
      ChangeBatch: {
        Changes: [
          {
            Action: 'UPSERT',
            ResourceRecordSet: {
              Name: 'second-record-name.qwerty.com',
              Type: 'CNAME',
              TTL: 60,
              ResourceRecords: [
                {
                  Value: 'second-record-value',
                },
              ],
            },
          },
        ],
      },
    })

    expect(stsMock).toHaveReceivedCommandWith(AssumeRoleCommand, {
      RoleArn: 'role-arn',
    })

    if (!result.Data) {
      throw new Error('no result data')
    }
    expect(result.Data).toBeDefined()
    expect(result.Data).toHaveProperty('certificateArn')
    expect(result.Data.certificateArn).toBe('cert-arn')
  })

  it('should handle not getting the required dns records on the first describe certificate call', async () => {
    stsMock.on(AssumeRoleCommand).resolves({
      Credentials: {
        AccessKeyId: 'key-id',
        SecretAccessKey: 'key-secret',
        SessionToken: 'session-token',
        Expiration: new Date(),
      },
    })
    acmMock.on(ListCertificatesCommand).resolves({
      CertificateSummaryList: [],
    })
    acmMock.on(RequestCertificateCommand).resolves({
      CertificateArn: 'cert-arn',
    })
    acmMock
      .on(DescribeCertificateCommand)
      .resolvesOnce({
        Certificate: {},
      })
      .resolvesOnce({
        Certificate: {
          DomainValidationOptions: [
            {
              ValidationStatus: 'SUCCESS',
              DomainName: '',
            },
            {
              ValidationStatus: 'SUCCESS',
              DomainName: '',
            },
          ],
        },
      })
      .resolves({
        Certificate: {
          DomainValidationOptions: [
            {
              ValidationStatus: 'SUCCESS',
              DomainName: '',
              ResourceRecord: {
                Name: 'first-record-name.asdf.com.',
                Type: 'CNAME',
                Value: 'first-record-value',
              },
            },
            {
              ValidationStatus: 'SUCCESS',
              DomainName: '',
              ResourceRecord: {
                Name: 'second-record-name.qwerty.com.',
                Type: 'CNAME',
                Value: 'second-record-value',
              },
            },
          ],
        },
      })

    route53Mock.on(ChangeResourceRecordSetsCommand).resolves({
      ChangeInfo: {
        Id: 'change-batch-id',
        Status: 'INSYNC',
        SubmittedAt: new Date(),
      },
    })

    route53Mock.on(GetChangeCommand).resolves({
      ChangeInfo: {
        Id: 'change-batch-id',
        Status: 'INSYNC',
        SubmittedAt: new Date(),
      },
    })

    const result = await onEvent(
      genEvent('Create', [
        {
          parentDomainName: 'asdf.com',
          hostedZoneId: '123',
        },
        {
          parentDomainName: 'qwerty.com',
          hostedZoneId: '456',
          roleArn: 'role-arn',
        },
      ]),
    )

    expect(acmMock).toHaveReceivedCommandWith(RequestCertificateCommand, {
      DomainName: '*.asdf.com',
      SubjectAlternativeNames: ['*.asdf.com', '*.qwerty.com'],
    })

    expect(route53Mock).toHaveReceivedCommandWith(ChangeResourceRecordSetsCommand, {
      HostedZoneId: '123',
      ChangeBatch: {
        Changes: [
          {
            Action: 'UPSERT',
            ResourceRecordSet: {
              Name: 'first-record-name.asdf.com.',
              Type: 'CNAME',
              TTL: 60,
              ResourceRecords: [
                {
                  Value: 'first-record-value',
                },
              ],
            },
          },
        ],
      },
    })

    expect(route53Mock).toHaveReceivedCommandWith(ChangeResourceRecordSetsCommand, {
      HostedZoneId: '456',
      ChangeBatch: {
        Changes: [
          {
            Action: 'UPSERT',
            ResourceRecordSet: {
              Name: 'second-record-name.qwerty.com.',
              Type: 'CNAME',
              TTL: 60,
              ResourceRecords: [
                {
                  Value: 'second-record-value',
                },
              ],
            },
          },
        ],
      },
    })

    expect(stsMock).toHaveReceivedCommandWith(AssumeRoleCommand, {
      RoleArn: 'role-arn',
    })

    if (!result.Data) {
      throw new Error('no result data')
    }
    expect(result.Data).toBeDefined()
    expect(result.Data).toHaveProperty('certificateArn')
    expect(result.Data.certificateArn).toBe('cert-arn')
  })

  it('should handle STS errors - empty object', async () => {
    stsMock.on(AssumeRoleCommand).resolves({
      //@ts-expect-error
      Credentials: {},
    })
    acmMock.on(ListCertificatesCommand).resolves({
      CertificateSummaryList: [],
    })
    acmMock.on(RequestCertificateCommand).resolves({
      CertificateArn: 'cert-arn',
    })

    route53Mock.on(ChangeResourceRecordSetsCommand).resolves({
      ChangeInfo: {
        Id: 'change-batch-id',
        Status: 'INSYNC',
        SubmittedAt: new Date(),
      },
    })

    route53Mock.on(GetChangeCommand).resolves({
      ChangeInfo: {
        Id: 'change-batch-id',
        Status: 'INSYNC',
        SubmittedAt: new Date(),
      },
    })

    acmMock
      .on(DescribeCertificateCommand)
      .resolvesOnce({
        Certificate: {},
      })
      .resolvesOnce({
        Certificate: {
          DomainValidationOptions: [
            {
              ValidationStatus: 'SUCCESS',
              DomainName: '',
            },
            {
              ValidationStatus: 'SUCCESS',
              DomainName: '',
            },
          ],
        },
      })
      .resolves({
        Certificate: {
          DomainValidationOptions: [
            {
              ValidationStatus: 'SUCCESS',
              DomainName: '',
              ResourceRecord: {
                Name: 'second-record-name.qwerty.com.',
                Type: 'CNAME',
                Value: 'second-record-value',
              },
            },
          ],
        },
      })

    const res = await onEvent(
      genEvent('Create', [
        {
          parentDomainName: 'qwerty.com',
          hostedZoneId: '456',
          roleArn: 'role-arn',
        },
      ]),
    )

    expect(res.Status).toBe('FAILED')
    expect(res.Reason?.split('\n')[0]).toBe(
      '[Error] invalid credentials returned from assumerole call: Error: invalid credentials returned from assumerole call',
    )
  })

  it('should handle STS errors - no Credentials', async () => {
    stsMock.on(AssumeRoleCommand).resolves({})
    acmMock.on(ListCertificatesCommand).resolves({
      CertificateSummaryList: [],
    })
    acmMock.on(RequestCertificateCommand).resolves({
      CertificateArn: 'cert-arn',
    })

    route53Mock.on(ChangeResourceRecordSetsCommand).resolves({
      ChangeInfo: {
        Id: 'change-batch-id',
        Status: 'INSYNC',
        SubmittedAt: new Date(),
      },
    })

    route53Mock.on(GetChangeCommand).resolves({
      ChangeInfo: {
        Id: 'change-batch-id',
        Status: 'INSYNC',
        SubmittedAt: new Date(),
      },
    })

    acmMock
      .on(DescribeCertificateCommand)
      .resolvesOnce({
        Certificate: {},
      })
      .resolvesOnce({
        Certificate: {
          DomainValidationOptions: [
            {
              ValidationStatus: 'SUCCESS',
              DomainName: '',
            },
            {
              ValidationStatus: 'SUCCESS',
              DomainName: '',
            },
          ],
        },
      })
      .resolves({
        Certificate: {
          DomainValidationOptions: [
            {
              ValidationStatus: 'SUCCESS',
              DomainName: '',
              ResourceRecord: {
                Name: 'second-record-name.qwerty.com.',
                Type: 'CNAME',
                Value: 'second-record-value',
              },
            },
          ],
        },
      })

    const res = await onEvent(
      genEvent('Create', [
        {
          parentDomainName: 'qwerty.com',
          hostedZoneId: '456',
          roleArn: 'role-arn',
        },
      ]),
    )

    expect(res.Status).toBe('FAILED')
    expect(res.Reason?.split('\n')[0]).toBe(
      '[Error] failed to assumed role role-arn: Error: failed to assumed role role-arn',
    )
  })

  it('onDelete - should delete the cert if its no longer in use', async () => {
    acmMock.on(DescribeCertificateCommand).resolvesOnce({
      Certificate: {
        InUseBy: [],
      },
    })
    await onEvent(genEvent('Delete'))
    expect(acmMock).toReceiveCommandWith(DescribeCertificateCommand, {
      CertificateArn: 'physical-resource-id',
    })
    expect(acmMock).toReceiveCommandWith(DeleteCertificateCommand, {
      CertificateArn: 'physical-resource-id',
    })
  })
  it('onDelete - should not delete the cert if its in use', async () => {
    acmMock.on(DescribeCertificateCommand).resolvesOnce({
      Certificate: {
        InUseBy: ['something'],
      },
    })
    await onEvent(genEvent('Delete'))
    expect(acmMock).toReceiveCommandWith(DescribeCertificateCommand, {
      CertificateArn: 'physical-resource-id',
    })
    expect(acmMock).not.toReceiveCommandWith(DeleteCertificateCommand, {
      CertificateArn: 'physical-resource-id',
    })
  })
})
