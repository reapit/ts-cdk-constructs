#!/bin/env node

import { Command } from 'commander'
import { randomUUID } from 'crypto'
import { Duration } from 'aws-cdk-lib'
import {
  SecretsManagerClient,
  CreateSecretCommand,
  PutSecretValueCommand,
  DeleteSecretCommand,
} from '@aws-sdk/client-secrets-manager'
import { getNewSecretString } from '../lambdas/key-rotation'
import { SecretObject } from '../lambdas/types'

const program = new Command()

program
  .option('--clientId <CLIENT ID>')
  .option('--clientSecret <CLIENT SECRET>')
  .option('--tenantId <TENANT ID>')
  .option('--keyId <KEY ID>')
program.parse()

const { clientId, clientSecret, tenantId, keyId } = program.opts()

if (!clientId || !clientSecret || !tenantId || !keyId) {
  throw new Error('missing option')
}

const go = async () => {
  console.log('Creating secret...')
  // create secret
  const ssm = new SecretsManagerClient({ region: process.env.AWS_REGION })
  const obj: SecretObject = {
    validForMsStr: Duration.days(30).toMilliseconds().toString(),
    clientId: clientId,
    secretText: clientSecret,
    keyId: keyId,
    tenantId,
  }
  const secret = await ssm.send(
    new CreateSecretCommand({
      Name: `entra-bootstrap-${randomUUID().split('-')[0]}-secret`,
      SecretString: JSON.stringify(obj),
    }),
  )

  if (!secret.ARN) {
    throw new Error('Created secret has no ARN')
  }
  console.log(`Created secret ${secret.ARN}`)

  console.log('Rotating...')
  process.env.BOOTSTRAP_CLIENT_SECRET_ID = secret.ARN

  try {
    await ssm.send(
      new PutSecretValueCommand({
        SecretId: secret.ARN,
        SecretString: await getNewSecretString(ssm, secret.ARN),
      }),
    )
  } catch (e) {
    console.error('Rotation failed, deleting secret...')
    await ssm.send(
      new DeleteSecretCommand({
        SecretId: secret.ARN,
        ForceDeleteWithoutRecovery: true,
      }),
    )
    console.error('Deleted secret, throwing original error...')
    throw e
  }

  console.log('✨ Complete')
  console.log(`Entra ID Boostrap Secret ARN: "${secret.ARN}"`)
  console.log(
    "Now create a stack which:\n\t1. Wraps the secret with EntraSelfRotatingKey so it's regularly rotated.\n\t2. Exports the secret arn so other stacks can use it.",
  )
}

go().catch((e) => {
  console.error(e)
  process.exit(1)
})
