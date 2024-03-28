import { Function } from 'aws-cdk-lib/aws-lambda'
import { Construct } from 'constructs'
import { EdgeFunctionProps } from 'aws-cdk-lib/aws-cloudfront/lib/experimental'

export interface EdgeAPILambdaProps extends EdgeFunctionProps {
  readonly codePath?: string
}

export class EdgeAPILambda extends Function {
  edgeEnvironment?: Record<string, string>
  codePath?: string

  constructor(scope: Construct, id: string, props: EdgeAPILambdaProps) {
    const { environment, codePath, ...rest } = props
    super(scope, id, rest)
    this.edgeEnvironment = environment
    this.codePath = codePath
  }

  addEdgeEnvironment(key: string, value: any) {
    if (!this.edgeEnvironment) {
      this.edgeEnvironment = {}
    }
    this.edgeEnvironment[key] = value
    return this
  }
}
