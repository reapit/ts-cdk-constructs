import { Construct } from 'constructs'
import {
  Destination,
  EdgeAPIProps,
  Endpoint,
  endpointIsFrontendEndpoint,
  endpointIsLambdaEndpoint,
  endpointIsProxyEndpoint,
  endpointIsRedirectionEndpoint,
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
  api: HttpApi
  private redirector?: Function
  private domainName: string

  constructor(scope: Construct, id: string, props: DevEdgeAPIProps) {
    super(scope, id)

    const domainName = props.domains[0]
    this.domainName = domainName
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

    if (props.defaultEndpoint.pathPattern !== '/*') {
      throw new Error('defaultEndpoint pathPattern is not "/*"')
    }
    this.addEndpoint(props.defaultEndpoint)
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

  private replaceStr(str: string, find: string, replace: string) {
    return Fn.join(replace, Fn.split(find, str))
  }

  private ensureHTTPS(url: string, insecure?: boolean) {
    const protocol = insecure ? 'http' : 'https'
    return `${protocol}://${this.replaceStr(this.replaceStr(url, 'http://', ''), 'https://', '')}`
  }

  private pickDestination(destination: Destination): string {
    if (typeof destination === 'string') {
      return destination
    }
    const map = destination[this.domainName]
    if (typeof map === 'string') {
      return map
    }
    if (typeof map.destination === 'string') {
      return map.destination
    }
    throw new Error(
      `Unable to find destination from ${JSON.stringify(destination)} for default domain "${this.domainName}"`,
    )
  }

  private cleanPathPattern(pathPattern: string): string {
    if (pathPattern === '/*') {
      return '/'
    }
    return pathPattern.endsWith('/*') ? pathPattern.replace('/*', '') : pathPattern
  }

  addEndpoint(endpoint: Endpoint) {
    if (endpointIsProxyEndpoint(endpoint)) {
      const methods = endpoint.methods ?? [HttpMethod.ANY]
      const cleanedPathPattern = this.cleanPathPattern(endpoint.pathPattern)
      let destPath = cleanedPathPattern === '/*' ? '' : cleanedPathPattern.replace('/*', '').replace('*', '')
      if (destPath === '/') {
        destPath = ''
      }
      this.api.addRoutes({
        path: cleanedPathPattern,
        integration: new HttpUrlIntegration(
          'proxy-integration',
          this.ensureHTTPS(this.pickDestination(endpoint.destination), endpoint.insecure) + destPath,
        ),
        methods,
      })
      if (endpoint.pathPattern.includes('*')) {
        this.api.addRoutes({
          path: endpoint.pathPattern.replace('*', '{proxy+}'),
          integration: new HttpUrlIntegration(
            'proxy-integration',
            this.ensureHTTPS(this.pickDestination(endpoint.destination), endpoint.insecure) + destPath + '/{proxy}',
          ),
          methods,
        })
      }
    } else if (endpointIsLambdaEndpoint(endpoint)) {
      const { pathPattern, lambdaFunction } = endpoint
      const methods = endpoint.methods ?? [HttpMethod.ANY]
      this.api.addRoutes({
        path: pathPattern.replace('*', '{proxy+}'),
        integration: new HttpLambdaIntegration(pathPattern + '-integration', lambdaFunction, {
          parameterMapping: this.generateParameterMapping(lambdaFunction.edgeEnvironment),
        }),
        methods,
      })
    } else if (endpointIsFrontendEndpoint(endpoint)) {
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
    } else if (endpointIsRedirectionEndpoint(endpoint)) {
      const { pathPattern, destination } = endpoint
      const integration = new HttpLambdaIntegration(pathPattern + '-integration', this.getRedirector(), {
        parameterMapping: this.generateParameterMapping({ destination: this.pickDestination(destination) }),
      })
      const path = this.cleanPathPattern(endpoint.pathPattern)
      this.api.addRoutes({
        path,
        integration,
        methods: [HttpMethod.GET],
      })
      if (pathPattern.endsWith('/*')) {
        this.api.addRoutes({
          path: pathPattern.replace('/*', '/{proxy+}'),
          integration,
          methods: [HttpMethod.GET],
        })
      }
    } else {
      throw new Error('unhandled endpoint type: ' + typeof endpoint + ' - ' + JSON.stringify(endpoint))
    }
  }
}
