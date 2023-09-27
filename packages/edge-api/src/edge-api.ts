import { Stack, Token } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { EdgeAPIProps, Endpoint } from './types'
import { ProductionEdgeAPI } from './production-edge-api'
import { RecordTarget } from 'aws-cdk-lib/aws-route53'

export class EdgeAPI extends Construct {
  private api: ProductionEdgeAPI
  route53Target: RecordTarget

  constructor(scope: Construct, id: string, props: EdgeAPIProps) {
    super(scope, id)
    const region = Stack.of(scope).region
    if (Token.isUnresolved(region)) {
      throw new Error('stack region must be explicitly specified')
    }
    if (region !== 'us-east-1' && !props.devMode) {
      throw new Error('deploying non-devMode EdgeAPI to a region other than us-east-1 is not yet supported, sorry')
    }
    this.api = new ProductionEdgeAPI(this, 'api', props)
    this.route53Target = this.api.r53Target
  }

  addEndpoint(endpoint: Endpoint) {
    this.api.addEndpoint(endpoint)
  }
}
