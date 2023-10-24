import { Function, FunctionProps } from 'aws-cdk-lib/aws-lambda'
import { Construct } from 'constructs'
import { EdgeFunctionProps } from 'aws-cdk-lib/aws-cloudfront/lib/experimental'

export class EdgeAPILambda extends Function {
  edgeEnvironment: FunctionProps['environment']
  codePath?: string

  constructor(
    scope: Construct,
    id: string,
    props: EdgeFunctionProps & { environment?: FunctionProps['environment']; codePath?: string },
  ) {
    const { environment, codePath, ...rest } = props
    super(scope, id, rest)
    this.edgeEnvironment = environment
    this.codePath = codePath
  }

  addEnvironment(key: string, value: any): this {
    if (!this.edgeEnvironment) {
      this.edgeEnvironment = {}
    }
    this.edgeEnvironment[key] = value
    return this
  }
}
