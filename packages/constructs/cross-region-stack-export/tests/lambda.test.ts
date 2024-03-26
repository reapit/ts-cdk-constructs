import { mockClient } from 'aws-sdk-client-mock'
import 'aws-sdk-client-mock-jest'
import { GetParametersByPathCommand, SSMClient } from '@aws-sdk/client-ssm'
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts'
import { onEvent } from '../src/lambda/lambda'

const ssmMock = mockClient(SSMClient)
const stsMock = mockClient(STSClient)

describe('remote-parameters', () => {
  beforeEach(() => {
    ssmMock.reset()
    stsMock.reset()
  })

  it('should fetch me the given parameters', async () => {
    ssmMock
      .on(GetParametersByPathCommand)
      .resolvesOnce({
        NextToken: '1234',
        Parameters: [
          {
            Name: 'something',
            Value: 'else',
          },
        ],
      })
      .resolvesOnce({
        NextToken: undefined,
        Parameters: [
          {
            Name: 'another',
            Value: 'thing',
          },
        ],
      })
    const res = await onEvent({
      RequestType: 'Create',
      LogicalResourceId: '1q23',
      RequestId: '1q23',
      ResourceProperties: {
        ServiceToken: 'asdf',
        stackName: 'asdf',
        regionName: 'eu-west-2',
        parameterPath: '/asd/dfg',
      },
      ResourceType: 'asdf',
      ResponseURL: 'asdf',
      ServiceToken: 'asdf',
      StackId: 'asdf',
    })

    if (!res.Data) {
      throw new Error('res.Data undefined')
    }

    expect(res.Data['something']).toBe('else')
    expect(res.Data['another']).toBe('thing')
  })

  it('should fetch me the given parameters assuming the given role', async () => {
    const creds = {
      AccessKeyId: 'key-id',
      SecretAccessKey: 'secret',
      Expiration: new Date(),
      SessionToken: 'token',
    }
    stsMock.on(AssumeRoleCommand).resolves({
      Credentials: creds,
    })
    ssmMock
      .on(GetParametersByPathCommand)
      .resolvesOnce({
        NextToken: '1234',
        Parameters: [
          {
            Name: 'something',
            Value: 'else',
          },
        ],
      })
      .resolvesOnce({
        NextToken: undefined,
        Parameters: [
          {
            Name: 'another',
            Value: 'thing',
          },
        ],
      })
    const res = await onEvent({
      RequestType: 'Create',
      LogicalResourceId: '1q23',
      RequestId: '1q23',
      ResourceProperties: {
        ServiceToken: 'asdf',
        stackName: 'stack-name',
        regionName: 'eu-west-2',
        parameterPath: '/asd/dfg',
        role: 'role-arn',
      },
      ResourceType: 'asdf',
      ResponseURL: 'asdf',
      ServiceToken: 'asdf',
      StackId: 'asdf',
    })

    if (!res.Data) {
      throw new Error('res.Data undefined')
    }

    expect(res.Data['something']).toBe('else')
    expect(res.Data['another']).toBe('thing')
    expect(stsMock).toReceiveCommandWith(AssumeRoleCommand, {
      RoleArn: 'role-arn',
      RoleSessionName: 'stack-name',
    })
  })
})
