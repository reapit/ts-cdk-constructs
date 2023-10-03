import { mockClient } from 'aws-sdk-client-mock'
import 'aws-sdk-client-mock-jest'
import {
  SESClient,
  DescribeActiveReceiptRuleSetCommand,
  CreateReceiptRuleSetCommand,
  SetActiveReceiptRuleSetCommand,
  DescribeReceiptRuleSetCommand,
  RuleSetDoesNotExistException,
  DeleteReceiptRuleSetCommand,
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
        Name: 'rpt-cdk-active-ruleset',
        $metadata: {},
      }),
    )
    const { Data } = await onEvent(genEvent())
    expect(sesMock).toHaveReceivedCommand(DescribeReceiptRuleSetCommand)
    expect(sesMock).toHaveReceivedCommandWith(CreateReceiptRuleSetCommand, {
      RuleSetName: 'rpt-cdk-active-ruleset',
    })
    expect(Data).toBeDefined()
    expect(Data?.ruleSetName).toBe('rpt-cdk-active-ruleset')
  })

  it('should activate the created ruleset if it doesnt exist', async () => {
    sesMock.on(DescribeActiveReceiptRuleSetCommand).resolves({})
    sesMock.on(CreateReceiptRuleSetCommand).resolves({})
    sesMock.on(SetActiveReceiptRuleSetCommand).resolves({})
    sesMock.on(DescribeReceiptRuleSetCommand).rejects(
      new RuleSetDoesNotExistException({
        message: 'doesnt exist',
        Name: 'rpt-cdk-active-ruleset',
        $metadata: {},
      }),
    )
    const { Data } = await onEvent(genEvent())
    expect(sesMock).toHaveReceivedCommandWith(SetActiveReceiptRuleSetCommand, {
      RuleSetName: 'rpt-cdk-active-ruleset',
    })
    expect(Data).toBeDefined()
    expect(Data?.ruleSetName).toBe('rpt-cdk-active-ruleset')
  })
  it('should activate the "default" ruleset if it exists', async () => {
    sesMock.on(DescribeActiveReceiptRuleSetCommand).resolves({})
    sesMock.on(CreateReceiptRuleSetCommand).resolves({})
    sesMock.on(SetActiveReceiptRuleSetCommand).resolves({})
    sesMock.on(DescribeReceiptRuleSetCommand).resolves({
      Metadata: {
        Name: 'rpt-cdk-active-ruleset',
      },
    })
    const { Data } = await onEvent(genEvent())
    expect(sesMock).toHaveReceivedCommandWith(SetActiveReceiptRuleSetCommand, {
      RuleSetName: 'rpt-cdk-active-ruleset',
    })
    expect(sesMock).not.toHaveReceivedCommand(CreateReceiptRuleSetCommand)
    expect(Data).toBeDefined()
    expect(Data?.ruleSetName).toBe('rpt-cdk-active-ruleset')
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
        Name: 'rpt-cdk-active-ruleset',
        $metadata: {},
      }),
    )
    const { Data } = await onEvent(genEvent('Update'))
    expect(sesMock).toHaveReceivedCommand(DescribeReceiptRuleSetCommand)
    expect(sesMock).toHaveReceivedCommandWith(CreateReceiptRuleSetCommand, {
      RuleSetName: 'rpt-cdk-active-ruleset',
    })
    expect(sesMock).toHaveReceivedCommandWith(SetActiveReceiptRuleSetCommand, {
      RuleSetName: 'rpt-cdk-active-ruleset',
    })
    expect(Data).toBeDefined()
    expect(Data?.ruleSetName).toBe('rpt-cdk-active-ruleset')
  })
  it('should deactivate and delete the active ruleset if we created it and its empty', async () => {
    sesMock.on(SetActiveReceiptRuleSetCommand).resolves({})
    sesMock.on(DescribeActiveReceiptRuleSetCommand).resolves({
      Metadata: {
        Name: 'rpt-cdk-active-ruleset',
      },
    })
    await onEvent(genEvent('Delete'))
    expect(sesMock).toHaveReceivedCommandWith(SetActiveReceiptRuleSetCommand, {
      RuleSetName: undefined,
    })
    expect(sesMock).toHaveReceivedCommand(DescribeActiveReceiptRuleSetCommand)
    expect(sesMock).toHaveReceivedCommandWith(DeleteReceiptRuleSetCommand, {
      RuleSetName: 'rpt-cdk-active-ruleset',
    })
  })

  it('should not delete the active ruleset it its not empty', async () => {
    sesMock.on(DescribeActiveReceiptRuleSetCommand).resolves({
      Metadata: {
        Name: 'rpt-cdk-active-ruleset',
      },
      Rules: [
        {
          Name: 'asdf',
        },
      ],
    })
    await onEvent(genEvent('Delete'))
    expect(sesMock).not.toHaveReceivedCommand(SetActiveReceiptRuleSetCommand)
    expect(sesMock).not.toHaveReceivedCommand(DeleteReceiptRuleSetCommand)
  })

  it('should not delete the active ruleset if its not ours', async () => {
    sesMock.on(DescribeActiveReceiptRuleSetCommand).resolves({
      Metadata: {
        Name: 'asdf',
      },
      Rules: [],
    })
    await onEvent(genEvent('Delete'))
    expect(sesMock).not.toHaveReceivedCommand(SetActiveReceiptRuleSetCommand)
    expect(sesMock).not.toHaveReceivedCommand(DeleteReceiptRuleSetCommand)
  })
})
