import { Function, FunctionProps } from 'aws-cdk-lib/aws-lambda'
import { Construct } from 'constructs'
import { EdgeFunctionProps } from 'aws-cdk-lib/aws-cloudfront/lib/experimental'

export class EdgeAPILambda extends Function {
  edgeEnvironment?: FunctionProps['environment']
  constructor(scope: Construct, id: string, props: EdgeFunctionProps & { environment?: FunctionProps['environment'] }) {
    const { environment, ...rest } = props
    super(scope, id, rest)
    this.edgeEnvironment = environment
  }
}
