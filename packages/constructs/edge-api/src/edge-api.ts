import { Stack, Token } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { EdgeAPIProps, Endpoint } from './types'
import { ProductionEdgeAPI } from './production-edge-api'
import { RecordTarget } from 'aws-cdk-lib/aws-route53'
import { DevEdgeAPI } from './dev-edge-api'

export class EdgeAPI extends Construct {
  private api: ProductionEdgeAPI | DevEdgeAPI
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
    if (props.devMode && props.webAclId) {
      console.warn('devMode enabled, ignoring webAclId')
    }
    this.api = props.devMode ? new DevEdgeAPI(this, 'api', props) : new ProductionEdgeAPI(this, 'api', props)
    this.route53Target = this.api.r53Target
  }

  addEndpoint(endpoint: Endpoint) {
    this.api.addEndpoint(endpoint)
  }
}
