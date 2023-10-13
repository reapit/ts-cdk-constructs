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
  DisableBuiltInMiddlewares,
  EdgeAPIProps,
  Endpoint,
  FrontendEndpoint,
  HttpMethod,
  LambdaEndpoint,
  ProxyEndpoint,
  ProxyMiddleware,
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
import * as path from 'path'
import * as crypto from 'crypto'
import { CloudfrontInvalidation } from '@reapit-cdk/cloudfront-invalidation'
import { generateLambda } from './generate-lambda'

interface ProductionEdgeAPIProps extends EdgeAPIProps {}

type EndpointBehaviorOptions = {
  origin: IOrigin
  addBehaviorOptions: AddBehaviorOptions
  pathPattern: string
}

export class ProductionEdgeAPI extends Construct {
  r53Target: RecordTarget

  private bucket: Bucket
  private originAccessIdentity: OriginAccessIdentity
  private invalidationPaths: string[] = []
  private distribution: Distribution

  constructor(scope: Construct, id: string, props: ProductionEdgeAPIProps) {
    super(scope, id)
    this.bucket = new Bucket(this, 'bucket')
    this.originAccessIdentity = new OriginAccessIdentity(this, 'oia', {})
    this.bucket.grantRead(this.originAccessIdentity)
    const distribution = new Distribution(this, 'Resource', {
      defaultBehavior: this.endpointToBehaviorOptions({
        ...props.defaultEndpoint,
        pathPattern: '',
      }),
      domainNames: props.domains,
      certificate: props.certificate,
    })
    this.r53Target = RecordTarget.fromAlias(new CloudFrontTarget(distribution))
    new CloudfrontInvalidation(this, 'invalidation', {
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

  private methodsToAllowedMethods(methods?: HttpMethod[]): AllowedMethods {
    if (!methods) {
      return AllowedMethods.ALLOW_ALL
    }

    const hasGet = methods.includes(HttpMethod.GET)
    const hasOptions = methods.includes(HttpMethod.OPTIONS)
    const hasHead = methods.includes(HttpMethod.HEAD)

    if (methods.length === 3 && hasGet && hasHead && hasOptions) {
      return AllowedMethods.ALLOW_GET_HEAD_OPTIONS
    }
    if (methods.length === 2 && hasGet && hasHead) {
      return AllowedMethods.ALLOW_GET_HEAD
    }
    if (methods.length === 1 && hasGet) {
      return AllowedMethods.ALLOW_GET_HEAD
    }

    return AllowedMethods.ALLOW_ALL
  }

  private lambdaEndpointToAddBehaviorOptions(endpoint: LambdaEndpoint): EndpointBehaviorOptions[] {
    const origin = new S3Origin(this.bucket, {
      originAccessIdentity: this.originAccessIdentity,
      customHeaders: {
        env: Fn.toJsonString(endpoint.lambda.edgeEnvironment),
      },
    })
    const addBehaviorOptions: AddBehaviorOptions = {
      allowedMethods: this.methodsToAllowedMethods(endpoint.methods),
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
    this.invalidationPaths.push(
      pathPattern,
      `${pathPattern}/`,
      `${pathPattern}/index.html`,
      ...(endpoint.invalidationItems ?? []).map((item) => `${pathPattern}/${item}`),
    )

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

  private generateRewriter(config: DisableBuiltInMiddlewares | undefined, domains: string[]) {
    const doRedirectRewrite = !config?.redirect
    const doCookieRewrite = !config?.cookie

    return Code.fromInline(
      generateLambda('rewriter', [
        ['var domains = ["example.org"]', 'var domains = ' + JSON.stringify(domains)],
        ['var doCookieRewrite = true', 'var doCookieRewrite = ' + doCookieRewrite],
        ['var doRedirectRewrite = true', 'var doRedirectRewrite = ' + doRedirectRewrite],
      ]),
    )
  }

  private proxyEndpointToAddBehaviorOptions(endpoint: ProxyEndpoint): EndpointBehaviorOptions[] {
    const baseAddBehaviorOptions: AddBehaviorOptions = {
      cachePolicy: CachePolicy.CACHING_DISABLED,
      allowedMethods: this.methodsToAllowedMethods(endpoint.methods),
      originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
    }
    if (typeof endpoint.destination === 'string') {
      const origin = new HttpOrigin(endpoint.destination, {
        protocolPolicy: OriginProtocolPolicy.HTTPS_ONLY,
      })
      const rewriterLambda = new EdgeAPILambda(this, 'rewriter-' + endpoint.destination, {
        runtime: Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: this.generateRewriter(endpoint.disableBuiltInMiddlewares, [endpoint.destination]),
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

      const opts: EndpointBehaviorOptions[] = [
        {
          origin,
          addBehaviorOptions,
          pathPattern: endpoint.pathPattern,
        },
      ]

      if (endpoint.pathPattern.endsWith('/*')) {
        opts.push({
          origin,
          addBehaviorOptions,
          pathPattern: endpoint.pathPattern.replace('/*', ''),
        })
      }

      return opts
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
      code: this.generateRewriter(
        endpoint.disableBuiltInMiddlewares,
        Object.values(endpoint.destination).map((destination) => {
          return typeof destination === 'string' ? destination : destination.destination
        }),
      ),
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
          functionVersion: this.getOriginSelectorLambda(endpoint.customMiddlewares).currentVersion,
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
  private originSelectorLambdas: Record<string, EdgeAPILambda> = {}
  private getOriginSelectorLambda(customMiddlewares?: ProxyMiddleware[]): EdgeAPILambda {
    if (customMiddlewares?.length) {
      const str = JSON.stringify(customMiddlewares.map((fn) => fn.toString()))
      const key = crypto.createHash('sha256').update(str).digest('hex').substring(0, 6)
      if (!this.originSelectorLambdas[key]) {
        this.originSelectorLambdas[key] = new EdgeAPILambda(this, 'origin-selector-' + key, {
          runtime: Runtime.NODEJS_18_X,
          handler: 'index.handler',
          code: Code.fromInline(
            generateLambda('origin-selector', [['var middlewares = []', `var middlewares = ${str}`]]),
          ),
        })
      }
      return this.originSelectorLambdas[key]
    }
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
