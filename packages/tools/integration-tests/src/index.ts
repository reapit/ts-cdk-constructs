import * as cdk from 'aws-cdk-lib'
// import { Aspects } from 'aws-cdk-lib'
// import { AwsSolutionsChecks } from 'cdk-nag'
export * from '@aws-cdk/integ-tests-alpha'
import * as integ from '@aws-cdk/integ-tests-alpha'

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
        region: process.env.INTEG_REGION,
      },
    })
  }
}

export class IntegTest extends integ.IntegTest {
  constructor(app: App, id: string, props: integ.IntegTestProps) {
    super(app, id, {
      ...props,
      assertionStack: props.assertionStack ?? new Stack(app, id + 'Assertions'),
    })
  }
}
