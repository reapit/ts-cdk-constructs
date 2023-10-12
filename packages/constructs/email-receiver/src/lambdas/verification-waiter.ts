import { customResourceWrapper } from '@reapit-cdk/custom-resource-wrapper'
import { SESv2Client, GetEmailIdentityCommand, VerificationStatus } from '@aws-sdk/client-sesv2'

const client = new SESv2Client()

const max = 30

const wait = async (ms: number) => {
  await new Promise<void>((resolve) => {
    if (process.env.TEST) {
      return resolve()
    }
    setTimeout(resolve, ms)
  })
}

const waitForVerification = async (emailIdentityName: string, iter: number = 0): Promise<VerificationStatus> => {
  if (iter > max) {
    throw new Error('wait for verification timed out')
  }

  const identity = await client.send(
    new GetEmailIdentityCommand({
      EmailIdentity: emailIdentityName,
    }),
  )

  switch (identity.VerificationStatus) {
    case VerificationStatus.FAILED: {
      throw new Error('AWS reports verification failed')
    }
    case VerificationStatus.SUCCESS: {
      if (!identity.VerifiedForSendingStatus) {
        await wait(5000)

        return await waitForVerification(emailIdentityName, iter + 1)
      }
      return identity.VerificationStatus
    }
    case VerificationStatus.TEMPORARY_FAILURE:
    case VerificationStatus.NOT_STARTED:
    case VerificationStatus.PENDING: {
      await wait(5000)

      return await waitForVerification(emailIdentityName, iter + 1)
    }
    default: {
      throw new Error(`Invalid verification status received from AWS: "${identity.VerificationStatus}"`)
    }
  }
}

export const onEvent = customResourceWrapper({
  onCreate: ({ emailIdentityName }) => waitForVerification(emailIdentityName),
  onUpdate: ({ emailIdentityName }) => waitForVerification(emailIdentityName),
})
