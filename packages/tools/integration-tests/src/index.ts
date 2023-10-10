import * as cdk from 'aws-cdk-lib'
// import { Aspects } from 'aws-cdk-lib'
// import { AwsSolutionsChecks } from 'cdk-nag'
export * from './integration-test'

export class App extends cdk.App {
  constructor() {
    super()
    // Aspects.of(this).add(new AwsSolutionsChecks({ verbose: true }))
  }
}

export class Stack extends cdk.Stack {
  constructor(app: App, id: string, props?: cdk.StackProps) {
    super(app, id, {
      ...(props ?? {}),
      env: props?.env ?? {
        account: process.env.AWS_ACCOUNT,
        region: process.env.INTEG_REGION || 'eu-central-1',
      },
    })
  }
}
