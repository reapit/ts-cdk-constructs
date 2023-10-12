import { mockClient } from 'aws-sdk-client-mock'
import 'aws-sdk-client-mock-jest'

import { SESv2Client, GetEmailIdentityCommand, VerificationStatus } from '@aws-sdk/client-sesv2'
import { onEvent } from '../src/lambdas/verification-waiter'

process.env.AWS_REGION = 'eu-west-2'
process.env.TEST = '1'

const sesv2Mock = mockClient(SESv2Client)

const genEvent = (emailIdentityName: string, RequestType: string = 'Create'): any => ({
  RequestType,
  LogicalResourceId: '123',
  RequestId: '123',
  ResourceType: '',
  ResponseURL: '',
  ServiceToken: '',
  StackId: '',
  ResourceProperties: {
    ServiceToken: '',
    emailIdentityName,
  },
})

describe('verification-waiter', () => {
  beforeEach(() => {
    sesv2Mock.reset()
  })

  it('should wait before returning', async () => {
    sesv2Mock
      .on(GetEmailIdentityCommand)
      .resolvesOnce({
        VerificationStatus: VerificationStatus.NOT_STARTED,
      })
      .resolvesOnce({
        VerificationStatus: VerificationStatus.PENDING,
      })
      .resolvesOnce({
        VerificationStatus: VerificationStatus.TEMPORARY_FAILURE,
      })
      .resolvesOnce({
        VerificationStatus: VerificationStatus.PENDING,
      })
      .resolvesOnce({
        VerificationStatus: VerificationStatus.TEMPORARY_FAILURE,
      })
      .resolvesOnce({
        VerificationStatus: VerificationStatus.PENDING,
      })
      .resolvesOnce({
        VerificationStatus: VerificationStatus.SUCCESS,
      })
      .resolves({
        VerificationStatus: VerificationStatus.SUCCESS,
        VerifiedForSendingStatus: true,
      })
    const res = await onEvent(genEvent('email-identity-name'))
    expect(res.Status).toBe('SUCCESS')
    expect(sesv2Mock).toReceiveCommandWith(GetEmailIdentityCommand, {
      EmailIdentity: 'email-identity-name',
    })
    expect(sesv2Mock).toReceiveCommandTimes(GetEmailIdentityCommand, 8)
  })

  it('should update', async () => {
    sesv2Mock
      .on(GetEmailIdentityCommand)
      .resolvesOnce({
        VerificationStatus: VerificationStatus.NOT_STARTED,
      })
      .resolvesOnce({
        VerificationStatus: VerificationStatus.PENDING,
      })
      .resolves({
        VerificationStatus: VerificationStatus.SUCCESS,
        VerifiedForSendingStatus: true,
      })
    const res = await onEvent(genEvent('email-identity-name', 'Update'))
    expect(res.Status).toBe('SUCCESS')
    expect(sesv2Mock).toReceiveCommandWith(GetEmailIdentityCommand, {
      EmailIdentity: 'email-identity-name',
    })
    expect(sesv2Mock).toReceiveCommandTimes(GetEmailIdentityCommand, 3)
  })

  it('should error if verification errors', async () => {
    sesv2Mock
      .on(GetEmailIdentityCommand)
      .resolvesOnce({
        VerificationStatus: VerificationStatus.NOT_STARTED,
      })
      .resolvesOnce({
        VerificationStatus: VerificationStatus.PENDING,
      })
      .resolves({
        VerificationStatus: VerificationStatus.FAILED,
      })
    const result = await onEvent(genEvent('email-identity-name'))
    expect(result.Status).toBe('FAILED')
    expect(result.Reason?.split('\n')[0]).toBe(
      '[Error] AWS reports verification failed: Error: AWS reports verification failed',
    )
  })

  it('should error if it times out', async () => {
    sesv2Mock
      .on(GetEmailIdentityCommand)
      .resolvesOnce({
        VerificationStatus: VerificationStatus.NOT_STARTED,
      })
      .resolves({
        VerificationStatus: VerificationStatus.PENDING,
      })

    const result = await onEvent(genEvent('email-identity-name'))
    expect(result.Status).toBe('FAILED')
    expect(result.Reason?.split('\n')[0]).toBe(
      '[Error] wait for verification timed out: Error: wait for verification timed out',
    )
    expect(sesv2Mock).toReceiveCommandTimes(GetEmailIdentityCommand, 31)
  })

  it('should error if it gets an invalid status back from AWS', async () => {
    sesv2Mock.on(GetEmailIdentityCommand).resolvesOnce({
      VerificationStatus: 'something weird',
    })
    const result = await onEvent(genEvent('email-identity-name'))
    expect(result.Status).toBe('FAILED')
    expect(result.Reason?.split('\n')[0]).toBe(
      '[Error] Invalid verification status received from AWS: "something weird": Error: Invalid verification status received from AWS: "something weird"',
    )
  })
})
