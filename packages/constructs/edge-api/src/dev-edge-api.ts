import { Construct } from 'constructs'
import {
  EdgeAPIProps,
  Endpoint,
  endpointIsFrontendEndpoint,
  endpointIsLambdaEndpoint,
  endpointIsProxyEndpoint,
} from './types'
import { DomainName, HttpApi, HttpMethod, ParameterMapping } from '@aws-cdk/aws-apigatewayv2-alpha'
import { HttpLambdaIntegration, HttpUrlIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha'
import { RecordTarget } from 'aws-cdk-lib/aws-route53'
import { ApiGatewayv2DomainProperties } from 'aws-cdk-lib/aws-route53-targets'
import { Fn } from 'aws-cdk-lib'
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda'
import * as path from 'path'

interface DevEdgeAPIProps extends EdgeAPIProps {}

export class DevEdgeAPI extends Construct {
  r53Target: RecordTarget
  private api: HttpApi
  private redirector?: Function

  constructor(scope: Construct, id: string, props: DevEdgeAPIProps) {
    super(scope, id)

    const domainName = props.domains[0]
    if (props.domains.length > 1) {
      console.warn('devMode EdgeAPI currently only supports a single domain, using ' + domainName)
    }
    const apigwDomainName = new DomainName(this, 'domain-' + domainName, {
      certificate: props.certificate,
      domainName,
    })
    this.r53Target = RecordTarget.fromAlias(
      new ApiGatewayv2DomainProperties(apigwDomainName.regionalDomainName, apigwDomainName.regionalHostedZoneId),
    )

    this.api = new HttpApi(this, id, {
      defaultDomainMapping: {
        domainName: apigwDomainName,
      },
    })

    this.addEndpoint({
      ...props.defaultEndpoint,
      pathPattern: '/*',
    })
  }

  private generateParameterMapping(
    functionEnv: Record<string, string> | { domainMapping: Record<string, Record<string, string>> } = {},
  ) {
    return new ParameterMapping().overwriteHeader('env', {
      value: Fn.base64(Fn.toJsonString(Object.keys(functionEnv).length ? functionEnv : { __placeholder: true })),
    })
  }

  private getRedirector() {
    if (!this.redirector) {
      this.redirector = new Function(this, 'redirect', {
        code: Code.fromAsset(path.resolve(__dirname, 'lambdas')),
        handler: 'redirector.handler',
        runtime: Runtime.NODEJS_18_X,
      })
    }
    return this.redirector
  }

  addEndpoint(endpoint: Endpoint) {
    if (endpointIsProxyEndpoint(endpoint)) {
      const methods = endpoint.methods ?? [HttpMethod.ANY]
      const strip = endpoint.pathPattern.replace('*', '').endsWith('/') && endpoint.pathPattern !== '/*'
      this.api.addRoutes({
        path: strip ? endpoint.pathPattern.replace('/*', '').replace('*', '') : endpoint.pathPattern.replace('*', ''),
        integration: new HttpUrlIntegration('proxy-integration', 'https://' + endpoint.destination),
        methods,
      })
      if (endpoint.pathPattern.includes('*')) {
        this.api.addRoutes({
          path: endpoint.pathPattern.replace('*', '{proxy+}'),
          integration: new HttpUrlIntegration('proxy-integration', 'https://' + endpoint.destination + '/{proxy}'),
          methods,
        })
      }
    }
    if (endpointIsLambdaEndpoint(endpoint)) {
      const { pathPattern, lambda } = endpoint
      const methods = endpoint.methods ?? [HttpMethod.ANY]
      this.api.addRoutes({
        path: pathPattern.replace('*', '{proxy+}'),
        integration: new HttpLambdaIntegration(pathPattern + '-integration', lambda, {
          parameterMapping: this.generateParameterMapping(lambda.edgeEnvironment),
        }),
        methods,
      })
    }
    if (endpointIsFrontendEndpoint(endpoint)) {
      const { pathPattern, bucket } = endpoint
      const integration = new HttpLambdaIntegration(pathPattern + '-integration', this.getRedirector(), {
        parameterMapping: this.generateParameterMapping({ destination: bucket.bucketWebsiteUrl }),
      })
      this.api.addRoutes({
        path: pathPattern.replace('*', ''),
        integration,
        methods: [HttpMethod.GET],
      })
      this.api.addRoutes({
        path: pathPattern.replace('*', '') + '/{proxy+}',
        integration,
        methods: [HttpMethod.GET],
      })
      this.api.addRoutes({
        path: pathPattern.replace('*', '') + '/config.js',
        integration: new HttpUrlIntegration(
          'proxy-integration',
          bucket.bucketWebsiteUrl + pathPattern.replace('*', '') + '/config.js',
        ),
        methods: [HttpMethod.GET],
      })
    }
  }
}
