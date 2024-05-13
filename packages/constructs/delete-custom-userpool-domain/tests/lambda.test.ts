import { mockClient } from 'aws-sdk-client-mock'
import 'aws-sdk-client-mock-jest'
import {
  CognitoIdentityProviderClient,
  DeleteUserPoolDomainCommand,
  DescribeUserPoolCommand,
} from '@aws-sdk/client-cognito-identity-provider'

import { onEvent } from '../src/lambda/lambda'

const cognitoMock = mockClient(CognitoIdentityProviderClient)

describe('delete-userpool-custom-domain', () => {
  beforeEach(() => {
    cognitoMock.reset()
  })

  it('should delete the cognito userpool custom domain if it exists', async () => {
    cognitoMock.on(DescribeUserPoolCommand).resolves({
      UserPool: {
        CustomDomain: 'something.com',
      },
    })
    cognitoMock.on(DeleteUserPoolDomainCommand).resolves({})

    await onEvent({
      RequestType: 'Create',
      LogicalResourceId: '123',
      RequestId: '123',
      ResourceType: 'asdf',
      ResponseURL: 'asdf',
      ServiceToken: 'asdf',
      StackId: 'asdf',
      ResourceProperties: {
        ServiceToken: 'asdf',
        hostedZoneId: 'hosted-zone-id',
        userPoolId: 'user-pool-id',
        fqdn: 'fqdn',
        aliasDNSName: 'alias-dns-name',
      },
    })

    expect(cognitoMock).toReceiveCommandWith(DescribeUserPoolCommand, {
      UserPoolId: 'user-pool-id',
    })
    expect(cognitoMock).toReceiveCommandWith(DeleteUserPoolDomainCommand, {
      Domain: 'something.com',
      UserPoolId: 'user-pool-id',
    })
  })
})
