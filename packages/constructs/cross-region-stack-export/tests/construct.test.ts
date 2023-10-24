import { Template } from 'aws-cdk-lib/assertions'
import * as cdk from 'aws-cdk-lib'
import { RemoteParameters } from '../src'

const synth = () => {
  const app = new cdk.App()
  const stack = new cdk.Stack(app)
  const remoteParameters = new RemoteParameters(stack, 'params', {
    path: 'asdf',
    region: 'eu-west-2',
  })
  const template = Template.fromStack(stack)
  return {
    remoteParameters,
    template,
    stack,
  }
}

describe('active-ruleset', () => {
  test('synthesizes', () => {
    const { remoteParameters, template } = synth()
    expect(remoteParameters).toBeDefined()
    expect(template).toBeDefined()
  })
})
