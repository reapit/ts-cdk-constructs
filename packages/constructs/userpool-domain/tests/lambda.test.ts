import { mockClient } from 'aws-sdk-client-mock'
import 'aws-sdk-client-mock-jest'
import {
  CognitoIdentityProviderClient,
  CreateUserPoolDomainCommand,
  DescribeUserPoolCommand,
} from '@aws-sdk/client-cognito-identity-provider'
import { onEvent } from '../src/lambda/lambda'
import { CloudFormationCustomResourceEvent } from 'aws-lambda'

const cognitoMock = mockClient(CognitoIdentityProviderClient)

jest.mock('crypto', () => {
  return {
    randomUUID: () => 'random-uuid',
  }
})

const genEvent = (): CloudFormationCustomResourceEvent => ({
  RequestType: 'Create',
  LogicalResourceId: '1q23',
  RequestId: '1q23',
  ResourceProperties: {
    ServiceToken: 'asdf',
    userPoolId: 'eu-west-8_user-pool-id',
  },
  ResourceType: 'asdf',
  ResponseURL: 'asdf',
  ServiceToken: 'asdf',
  StackId: 'asdf',
})

describe('userpool-domain', () => {
  beforeEach(() => {
    cognitoMock.reset()
  })

  it('should add a cognito domain if it doesnt exist', async () => {
    cognitoMock
      .on(DescribeUserPoolCommand)
      .resolvesOnce({
        UserPool: {},
      })
      .resolvesOnce({
        UserPool: {
          Domain: 'random-uuid',
        },
      })
    cognitoMock.on(CreateUserPoolDomainCommand).resolves({
      CloudFrontDomain: 'something.com',
    })

    const res = await onEvent(genEvent())
    expect(cognitoMock).toHaveReceivedCommandWith(DescribeUserPoolCommand, {
      UserPoolId: 'eu-west-8_user-pool-id',
    })
    expect(cognitoMock).toHaveReceivedCommandWith(CreateUserPoolDomainCommand, {
      Domain: 'random-uuid',
      UserPoolId: 'eu-west-8_user-pool-id',
    })
    if (!res.Data) {
      throw new Error('res.Data undefined')
    }
    expect(res.Data.domain).toBe('random-uuid')
  })
  it('should return the cognito domain if it exists', async () => {
    cognitoMock.on(DescribeUserPoolCommand).resolves({
      UserPool: {
        Domain: 'something.com',
      },
    })
    const res = await onEvent(genEvent())
    expect(cognitoMock).toHaveReceivedCommandWith(DescribeUserPoolCommand, {
      UserPoolId: 'eu-west-8_user-pool-id',
    })
    expect(cognitoMock).not.toHaveReceivedCommand(CreateUserPoolDomainCommand)
    if (!res.Data) {
      throw new Error('res.Data undefined')
    }
    expect(res.Data.domain).toBe('something.com')
  })
  it('should return the cognito domain if it exists with custom domain', async () => {
    cognitoMock.on(DescribeUserPoolCommand).resolves({
      UserPool: {
        Domain: 'something.com',
        CustomDomain: 'something-else.com',
      },
    })
    const res = await onEvent(genEvent())
    expect(cognitoMock).toHaveReceivedCommandWith(DescribeUserPoolCommand, {
      UserPoolId: 'eu-west-8_user-pool-id',
    })
    expect(cognitoMock).not.toHaveReceivedCommand(CreateUserPoolDomainCommand)
    if (!res.Data) {
      throw new Error('res.Data undefined')
    }
    expect(res.Data.domain).toBe('something.com')
  })
  it('should add a cognito domain if it doesnt exist', async () => {
    cognitoMock
      .on(DescribeUserPoolCommand)
      .resolvesOnce({
        UserPool: {
          Domain: 'something.com',
          CustomDomain: 'something.com',
        },
      })
      .resolvesOnce({
        UserPool: {
          Domain: 'random-uuid',
          CustomDomain: 'something.com',
        },
      })
    cognitoMock.on(CreateUserPoolDomainCommand).resolves({
      CloudFrontDomain: 'something.com',
    })
    const res = await onEvent(genEvent())
    expect(cognitoMock).toHaveReceivedCommandWith(DescribeUserPoolCommand, {
      UserPoolId: 'eu-west-8_user-pool-id',
    })
    expect(cognitoMock).toHaveReceivedCommandWith(CreateUserPoolDomainCommand, {
      Domain: 'random-uuid',
      UserPoolId: 'eu-west-8_user-pool-id',
    })
    if (!res.Data) {
      throw new Error('res.Data undefined')
    }
    expect(res.Data.domain).toBe('random-uuid')
  })
})
