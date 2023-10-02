import * as cdk from 'aws-cdk-lib'
import { Aspects } from 'aws-cdk-lib'
import { AwsSolutionsChecks } from 'cdk-nag'
export * from '@aws-cdk/integ-tests-alpha'

export class App extends cdk.App {
  constructor() {
    super()
    Aspects.of(this).add(new AwsSolutionsChecks({ verbose: true }))
  }
}
