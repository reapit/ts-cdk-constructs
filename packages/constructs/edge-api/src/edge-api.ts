import { Stack, Token } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { EdgeAPIProps, Endpoint } from './types'
import { ProductionEdgeAPI } from './production-edge-api'
import { RecordTarget } from 'aws-cdk-lib/aws-route53'
import { DevEdgeAPI } from './dev-edge-api'
import { Distribution } from 'aws-cdk-lib/aws-cloudfront'
import { HttpApi } from '@aws-cdk/aws-apigatewayv2-alpha'

export class EdgeAPI extends Construct {
  private api: ProductionEdgeAPI | DevEdgeAPI

  route53Target: RecordTarget

  _distribution?: Distribution
  _httpApi?: HttpApi
  _endpoints: Endpoint[]

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
    this._endpoints = []
    this.api = props.devMode ? new DevEdgeAPI(this, 'api', props) : new ProductionEdgeAPI(this, 'api', props)
    this.route53Target = this.api.r53Target
    if (this.api instanceof ProductionEdgeAPI) {
      this._distribution = this.api.distribution
    }
    if (this.api instanceof DevEdgeAPI) {
      this._httpApi = this.api.api
    }
  }

  addEndpoint(endpoint: Endpoint) {
    this.api.addEndpoint(endpoint)
    this._endpoints.push(endpoint)
  }
}
