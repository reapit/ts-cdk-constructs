import { IntegTest, ExpectedResult, App } from '@reapit-cdk/integration-tests'
import { Stack } from 'aws-cdk-lib'

import { ReplicatedSecret } from '../dist'
import { ReplicatedKey } from '@reapit-cdk/replicated-key'

const app = new App()

const stack = new Stack(app, 'replicated-secret-test-stack')

const key = new ReplicatedKey(stack, 'replicated-key', {
  replicaRegions: ['eu-west-1', 'eu-west-2'],
})
const secret = new ReplicatedSecret(stack, 'certificate', {
  replicatedKey: key,
  replicaRegions: ['eu-west-1', 'eu-west-2'],
})

const integ = new IntegTest(app, 'ReplicatedSecretTest', {
  testCases: [stack],
  cdkCommandOptions: {
    destroy: {
      args: {
        force: true,
      },
    },
  },
  diffAssets: true,
  regions: [stack.region],
})

const assertion = integ.assertions
  .awsApiCall('secretsmanager', 'DescribeSecret', {
    SecretId: secret.secretArn,
  })
  .expect(
    ExpectedResult.objectLike({
      ReplicationStatus: [
        {
          Region: 'eu-west-1',
          KmsKeyId: key.getRegionalKey('eu-west-1').keyId,
          Status: 'InSync',
        },
        {
          Region: 'eu-west-2',
          KmsKeyId: key.getRegionalKey('eu-west-2').keyId,
          Status: 'InSync',
        },
      ],
    }),
  )

assertion.provider.addToRolePolicy({
  Effect: 'Allow',
  Action: ['secretsmanager:DescribeSecret'],
  Resource: ['*'],
})
