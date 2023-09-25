import { mockClient } from 'aws-sdk-client-mock'
import 'aws-sdk-client-mock-jest'
import {
  SESClient,
  DescribeActiveReceiptRuleSetCommand,
  CreateReceiptRuleSetCommand,
  SetActiveReceiptRuleSetCommand,
  DescribeReceiptRuleSetCommand,
  RuleSetDoesNotExistException,
} from '@aws-sdk/client-ses'

import { onEvent } from '../src/lambda/lambda'

const sesMock = mockClient(SESClient)

const genEvent = (RequestType: string = 'Create'): any => ({
  RequestType,
  LogicalResourceId: '1q23',
  RequestId: '1q23',
  ResourceProperties: {
    ServiceToken: 'asdf',
  },
  OldResourceProperties: {},
  ResourceType: 'asdf',
  ResponseURL: 'asdf',
  ServiceToken: 'asdf',
  StackId: 'asdf',
})

describe('ensure-active-ruleset', () => {
  beforeEach(() => {
    sesMock.reset()
  })

  it('should create a ruleset if it doesnt exist', async () => {
    sesMock.on(DescribeActiveReceiptRuleSetCommand).resolves({})
    sesMock.on(CreateReceiptRuleSetCommand).resolves({})
    sesMock.on(SetActiveReceiptRuleSetCommand).resolves({})
    sesMock.on(DescribeReceiptRuleSetCommand).rejects(
      new RuleSetDoesNotExistException({
        message: 'doesnt exist',
        Name: 'default',
        $metadata: {},
      }),
    )
    const { Data } = await onEvent(genEvent())
    expect(sesMock).toHaveReceivedCommand(DescribeReceiptRuleSetCommand)
    expect(sesMock).toHaveReceivedCommandWith(CreateReceiptRuleSetCommand, {
      RuleSetName: 'default',
    })
    expect(Data).toBeDefined()
    expect(Data?.ruleSetName).toBe('default')
  })

  it('should activate the created ruleset if it doesnt exist', async () => {
    sesMock.on(DescribeActiveReceiptRuleSetCommand).resolves({})
    sesMock.on(CreateReceiptRuleSetCommand).resolves({})
    sesMock.on(SetActiveReceiptRuleSetCommand).resolves({})
    sesMock.on(DescribeReceiptRuleSetCommand).rejects(
      new RuleSetDoesNotExistException({
        message: 'doesnt exist',
        Name: 'default',
        $metadata: {},
      }),
    )
    const { Data } = await onEvent(genEvent())
    expect(sesMock).toHaveReceivedCommandWith(SetActiveReceiptRuleSetCommand, {
      RuleSetName: 'default',
    })
    expect(Data).toBeDefined()
    expect(Data?.ruleSetName).toBe('default')
  })
  it('should activate the "default" ruleset if it exists', async () => {
    sesMock.on(DescribeActiveReceiptRuleSetCommand).resolves({})
    sesMock.on(CreateReceiptRuleSetCommand).resolves({})
    sesMock.on(SetActiveReceiptRuleSetCommand).resolves({})
    sesMock.on(DescribeReceiptRuleSetCommand).resolves({
      Metadata: {
        Name: 'default',
      },
    })
    const { Data } = await onEvent(genEvent())
    expect(sesMock).toHaveReceivedCommandWith(SetActiveReceiptRuleSetCommand, {
      RuleSetName: 'default',
    })
    expect(sesMock).not.toHaveReceivedCommand(CreateReceiptRuleSetCommand)
    expect(Data).toBeDefined()
    expect(Data?.ruleSetName).toBe('default')
  })
  it('should return the active ruleset if it exists', async () => {
    sesMock.on(DescribeActiveReceiptRuleSetCommand).resolves({
      Metadata: {
        Name: 'helloooo',
      },
    })
    const { Data } = await onEvent({
      RequestType: 'Create',
      LogicalResourceId: '1q23',
      RequestId: '1q23',
      ResourceProperties: {
        ServiceToken: 'asdf',
      },
      ResourceType: 'asdf',
      ResponseURL: 'asdf',
      ServiceToken: 'asdf',
      StackId: 'asdf',
    })
    expect(sesMock).not.toHaveReceivedCommand(CreateReceiptRuleSetCommand)
    expect(sesMock).not.toHaveReceivedCommand(SetActiveReceiptRuleSetCommand)
    expect(Data).toBeDefined()
    expect(Data?.ruleSetName).toBe('helloooo')
  })
  it('should do the same on Update', async () => {
    sesMock.on(DescribeActiveReceiptRuleSetCommand).resolves({})
    sesMock.on(CreateReceiptRuleSetCommand).resolves({})
    sesMock.on(SetActiveReceiptRuleSetCommand).resolves({})
    sesMock.on(DescribeReceiptRuleSetCommand).rejects(
      new RuleSetDoesNotExistException({
        message: 'doesnt exist',
        Name: 'default',
        $metadata: {},
      }),
    )
    const { Data } = await onEvent(genEvent('Update'))
    expect(sesMock).toHaveReceivedCommand(DescribeReceiptRuleSetCommand)
    expect(sesMock).toHaveReceivedCommandWith(CreateReceiptRuleSetCommand, {
      RuleSetName: 'default',
    })
    expect(sesMock).toHaveReceivedCommandWith(SetActiveReceiptRuleSetCommand, {
      RuleSetName: 'default',
    })
    expect(Data).toBeDefined()
    expect(Data?.ruleSetName).toBe('default')
  })
})
