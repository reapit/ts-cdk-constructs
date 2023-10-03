import { IntegTest, ExpectedResult, App } from '@reapit-cdk/integration-tests'
import { Stack } from 'aws-cdk-lib'

import { ReplicatedKey } from '../dist'

const app = new App()

const stack = new Stack(app, 'replicated-key-test-stack')

const key = new ReplicatedKey(stack, 'replicated-key', {
  replicaRegions: ['eu-west-1', 'eu-west-2'],
})
const integ = new IntegTest(app, 'ReplicatedKeyTest', {
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
// TODO: cross-region awsApiCall
const assertion = integ.assertions
  .awsApiCall('kms', 'DescribeKey', {
    KeyId: key.getRegionalKey('eu-west-1'),
  })
  .expect(
    ExpectedResult.objectLike({
      KeyMetadata: {
        KeyState: 'Enabled',
      },
    }),
  )
  .next(
    integ.assertions
      .awsApiCall('kms', 'DescribeKey', {
        KeyId: key.getRegionalKey('eu-west-2'),
      })
      .expect(
        ExpectedResult.objectLike({
          KeyMetadata: {
            KeyState: 'Enabled',
          },
        }),
      ),
  )

assertion.provider.addToRolePolicy({
  Effect: 'Allow',
  Action: ['secretsmanager:DescribeSecret'],
  Resource: ['*'],
})
