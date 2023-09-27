import {
  AddBehaviorOptions,
  AllowedMethods,
  BehaviorOptions,
  CachePolicy,
  Distribution,
  IOrigin,
  LambdaEdgeEventType,
  OriginAccessIdentity,
  OriginProtocolPolicy,
  OriginRequestPolicy,
} from 'aws-cdk-lib/aws-cloudfront'
import { Bucket } from 'aws-cdk-lib/aws-s3'
import { Construct } from 'constructs'
import {
  EdgeAPIProps,
  Endpoint,
  FrontendEndpoint,
  LambdaEndpoint,
  ProxyEndpoint,
  endpointIsFrontendEndpoint,
  endpointIsLambdaEndpoint,
  endpointIsProxyEndpoint,
} from './types'
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets'
import { RecordTarget } from 'aws-cdk-lib/aws-route53'
import { Fn } from 'aws-cdk-lib'
import { HttpOrigin, S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins'
import { EdgeAPILambda } from './edge-api-lambda'
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda'
import * as fs from 'fs'
import * as path from 'path'
import { InvalidateCloudfrontDistribution } from './invalidate-cloudfront-distribution'

interface ProductionEdgeAPIProps extends EdgeAPIProps {}

type EndpointBehaviorOptions = {
  origin: IOrigin
  addBehaviorOptions: AddBehaviorOptions
  pathPattern: string
}

export class ProductionEdgeAPI extends Construct {
  private bucket: Bucket
  private originAccessIdentity: OriginAccessIdentity
  r53Target: RecordTarget
  private invalidationPaths: string[] = []
  distribution: Distribution

  constructor(scope: Construct, id: string, props: ProductionEdgeAPIProps) {
    super(scope, id)
    this.bucket = new Bucket(this, 'bucket')
    this.originAccessIdentity = new OriginAccessIdentity(this, 'oia', {})
    this.bucket.grantRead(this.originAccessIdentity)
    const distribution = new Distribution(this, 'Resource', {
      defaultBehavior: this.endpointToBehaviorOptions(props.defaultEndpoint),
      domainNames: props.domains,
      certificate: props.certificate,
    })
    this.r53Target = RecordTarget.fromAlias(new CloudFrontTarget(distribution))
    new InvalidateCloudfrontDistribution(this, 'invalidation', {
      distribution,
      items: this.invalidationPaths,
    })
    this.distribution = distribution
  }

  addEndpoint(endpoint: Endpoint) {
    this.endpointToAddBehaviorOptions(endpoint)
      .flat()
      .forEach(({ addBehaviorOptions, origin, pathPattern }) => {
        this.distribution.addBehavior(pathPattern, origin, addBehaviorOptions)
      })
  }

  private lambdaEndpointToAddBehaviorOptions(endpoint: LambdaEndpoint): EndpointBehaviorOptions[] {
    const origin = new S3Origin(this.bucket, {
      originAccessIdentity: this.originAccessIdentity,
      customHeaders: {
        env: Fn.toJsonString(endpoint.lambda.edgeEnvironment),
      },
    })
    const addBehaviorOptions: AddBehaviorOptions = {
      allowedMethods: AllowedMethods.ALLOW_ALL,
      cachePolicy: endpoint.static ? CachePolicy.CACHING_OPTIMIZED : CachePolicy.CACHING_DISABLED,
      originRequestPolicy: OriginRequestPolicy.ALL_VIEWER,
      edgeLambdas: [
        {
          eventType: LambdaEdgeEventType.ORIGIN_REQUEST,
          includeBody: true,
          functionVersion: endpoint.lambda.currentVersion,
        },
      ],
    }
    if (endpoint.static) {
      this.invalidationPaths.push(endpoint.pathPattern)
    }
    return [
      {
        pathPattern: endpoint.pathPattern,
        origin,
        addBehaviorOptions,
      },
    ]
  }

  private frontendEndpointToAddBehaviorOptions(endpoint: FrontendEndpoint): EndpointBehaviorOptions[] {
    endpoint.bucket.grantRead(this.originAccessIdentity)
    const { pathPattern } = endpoint
    const origin = new S3Origin(endpoint.bucket, {
      originAccessIdentity: this.originAccessIdentity,
    })
    this.invalidationPaths.push(pathPattern, `${pathPattern}/`, `${pathPattern}/index.html`)

    return [
      {
        origin,
        pathPattern,
        addBehaviorOptions: {
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
          cachePolicy: CachePolicy.CACHING_DISABLED,
          originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          edgeLambdas: [
            {
              eventType: LambdaEdgeEventType.ORIGIN_RESPONSE,
              functionVersion: this.getS3QsRedirect().currentVersion,
            },
          ],
        },
      },
      {
        origin,
        pathPattern: pathPattern + '/*',
        addBehaviorOptions: {
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
          cachePolicy: CachePolicy.CACHING_OPTIMIZED,
          originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      },
    ]
  }

  private generateRewriter(domains: string[]) {
    return Code.fromInline(
      fs
        .readFileSync(path.resolve(__dirname, 'lambdas', 'rewriter.js'), 'utf-8')
        .replace('const domains = []', 'const domains = ' + JSON.stringify(domains)),
    )
  }

  private proxyEndpointToAddBehaviorOptions(endpoint: ProxyEndpoint): EndpointBehaviorOptions[] {
    const baseAddBehaviorOptions: AddBehaviorOptions = {
      cachePolicy: CachePolicy.CACHING_DISABLED,
      allowedMethods: AllowedMethods.ALLOW_ALL,
      originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
    }
    if (typeof endpoint.destination === 'string') {
      const origin = new HttpOrigin(endpoint.destination, {
        protocolPolicy: OriginProtocolPolicy.HTTPS_ONLY,
      })
      const rewriterLambda = new EdgeAPILambda(this, 'rewriter-' + endpoint.destination, {
        runtime: Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: this.generateRewriter([endpoint.destination]),
      })
      const addBehaviorOptions: AddBehaviorOptions = {
        ...baseAddBehaviorOptions,
        edgeLambdas: [
          {
            eventType: LambdaEdgeEventType.VIEWER_RESPONSE,
            functionVersion: rewriterLambda.currentVersion,
          },
        ],
      }

      return [
        {
          origin,
          addBehaviorOptions,
          pathPattern: endpoint.pathPattern,
        },
      ]
    }

    const origin = new HttpOrigin('example.org', {
      protocolPolicy: OriginProtocolPolicy.HTTPS_ONLY,
      customHeaders: {
        env: Fn.toJsonString({
          domainMapping: endpoint.destination,
        }),
      },
    })
    const rewriterLambda = new EdgeAPILambda(this, 'rewriter-' + endpoint.destination, {
      runtime: Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: this.generateRewriter(Object.values(endpoint.destination)),
    })
    const addBehaviorOptions: AddBehaviorOptions = {
      ...baseAddBehaviorOptions,
      edgeLambdas: [
        {
          eventType: LambdaEdgeEventType.VIEWER_REQUEST,
          functionVersion: this.getHostForwarderLambda().currentVersion,
        },
        {
          eventType: LambdaEdgeEventType.ORIGIN_REQUEST,
          functionVersion: this.getOriginSelectorLambda().currentVersion, // TODO: add extra middlewares
        },
        {
          eventType: LambdaEdgeEventType.VIEWER_RESPONSE,
          functionVersion: rewriterLambda.currentVersion,
        },
      ],
    }

    return [
      {
        pathPattern: endpoint.pathPattern,
        addBehaviorOptions,
        origin,
      },
    ]
  }

  private endpointToAddBehaviorOptions(endpoint: Endpoint): EndpointBehaviorOptions[] {
    if (endpointIsLambdaEndpoint(endpoint)) {
      return this.lambdaEndpointToAddBehaviorOptions(endpoint)
    }

    if (endpointIsFrontendEndpoint(endpoint)) {
      return this.frontendEndpointToAddBehaviorOptions(endpoint)
    }

    if (endpointIsProxyEndpoint(endpoint)) {
      return this.proxyEndpointToAddBehaviorOptions(endpoint)
    }

    throw new Error('unhandled endpoint type')
  }

  private endpointToBehaviorOptions(endpoint: Endpoint): BehaviorOptions {
    const [{ addBehaviorOptions, origin }] = this.endpointToAddBehaviorOptions(endpoint)
    return {
      ...addBehaviorOptions,
      origin,
    }
  }

  private s3QsRedirect?: EdgeAPILambda
  private getS3QsRedirect(): EdgeAPILambda {
    if (!this.s3QsRedirect) {
      this.s3QsRedirect = new EdgeAPILambda(this, 's3-qs-redirect', {
        runtime: Runtime.NODEJS_18_X,
        handler: 's3-qs-redirect.handler',
        code: Code.fromAsset(path.resolve(__dirname, 'lambdas')),
      })
    }
    return this.s3QsRedirect
  }

  private hostForwarderLambda?: EdgeAPILambda
  private getHostForwarderLambda(): EdgeAPILambda {
    if (!this.hostForwarderLambda) {
      this.hostForwarderLambda = new EdgeAPILambda(this, 'host-forwarder', {
        runtime: Runtime.NODEJS_18_X,
        handler: 'host-forwarder.handler',
        code: Code.fromAsset(path.resolve(__dirname, 'lambdas')),
      })
    }
    return this.hostForwarderLambda
  }

  private originSelectorLambda?: EdgeAPILambda
  private getOriginSelectorLambda(): EdgeAPILambda {
    if (!this.originSelectorLambda) {
      this.originSelectorLambda = new EdgeAPILambda(this, 'origin-selector', {
        runtime: Runtime.NODEJS_18_X,
        handler: 'origin-selector.handler',
        code: Code.fromAsset(path.resolve(__dirname, 'lambdas')),
      })
    }
    return this.originSelectorLambda
  }
}
