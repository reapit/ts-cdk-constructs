import { Template } from 'aws-cdk-lib/assertions'
import * as cdk from 'aws-cdk-lib'
import { CloudfrontInvalidation } from '../src'
import { Distribution } from 'aws-cdk-lib/aws-cloudfront'
import { HttpOrigin } from 'aws-cdk-lib/aws-cloudfront-origins'

const synth = (items?: string[]) => {
  const app = new cdk.App()
  const stack = new cdk.Stack(app, 'stack', {
    env: {
      region: 'eu-west-2',
    },
  })
  const distribution = new Distribution(stack, 'distribution', {
    defaultBehavior: {
      origin: new HttpOrigin('example.org'),
    },
  })
  const invalidation = new CloudfrontInvalidation(stack, 'invalidation', {
    distribution,
    items,
    invalidateOnCreation: true,
  })
  const template = () => Template.fromStack(stack)
  return {
    invalidation,
    template,
    stack,
  }
}

describe('cloudfront-invalidation', () => {
  test('synthesizes', () => {
    const { invalidation, template } = synth()
    expect(invalidation).toBeDefined()
    expect(template).toBeDefined()
  })
  test('invalidates /index.html by default', () => {
    const { template } = synth()
    template().hasResourceProperties('AWS::StepFunctions::StateMachine', {
      DefinitionString: {
        'Fn::Join': [
          '',
          [
            '{"StartAt":"CreateInvalidation","States":{"CreateInvalidation":{"End":true,"Retry":[{"ErrorEquals":["CloudFront.CloudFrontException"],"IntervalSeconds":5,"MaxAttempts":10,"BackoffRate":2}],"Type":"Task","Resource":"arn:',
            {
              Ref: 'AWS::Partition',
            },
            ':states:::aws-sdk:cloudfront:createInvalidation","Parameters":{"DistributionId":"',
            {
              Ref: 'distribution114A0A2A',
            },
            '","InvalidationBatch":{"CallerReference.$":"$","Paths":{"Items":["/index.html"],"Quantity":1}}}}}}',
          ],
        ],
      },
    })
  })

  test('invalidates the items passed in lazily', () => {
    const items = ['/index.html']
    const { template } = synth(items)
    items.push('/config.js')
    template().hasResourceProperties('AWS::StepFunctions::StateMachine', {
      DefinitionString: {
        'Fn::Join': [
          '',
          [
            '{"StartAt":"CreateInvalidation","States":{"CreateInvalidation":{"End":true,"Retry":[{"ErrorEquals":["CloudFront.CloudFrontException"],"IntervalSeconds":5,"MaxAttempts":10,"BackoffRate":2}],"Type":"Task","Resource":"arn:',
            {
              Ref: 'AWS::Partition',
            },
            ':states:::aws-sdk:cloudfront:createInvalidation","Parameters":{"DistributionId":"',
            {
              Ref: 'distribution114A0A2A',
            },
            '","InvalidationBatch":{"CallerReference.$":"$","Paths":{"Items":["/index.html","/config.js"],"Quantity":2}}}}}}',
          ],
        ],
      },
    })
  })
})
