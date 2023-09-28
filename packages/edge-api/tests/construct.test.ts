import { Template } from 'aws-cdk-lib/assertions'
import * as cdk from 'aws-cdk-lib'
import { EdgeAPI } from '../src'
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager'
import { EdgeAPIProps, HttpMethod } from '../src/types'
import { Bucket } from 'aws-cdk-lib/aws-s3'
import { EdgeAPILambda } from '../src/edge-api-lambda'
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda'
import { CloudFrontRequest, CloudFrontRequestEvent } from 'aws-lambda'

const testGeneratedLambda = async (code: string, req: CloudFrontRequestEvent): Promise<CloudFrontRequest> => {
  const handler = eval(`${code} handler`)
  return handler(req)
}

const synth = (region: string = 'us-east-1', props: Partial<EdgeAPIProps> = {}) => {
  const app = new cdk.App()
  const stack = new cdk.Stack(app, 'stack', {
    env: {
      region,
    },
  })
  const certificate = new Certificate(stack, 'certificate', {
    domainName: 'example.org',
  })
  const api = new EdgeAPI(stack, 'api', {
    certificate,
    domains: ['example.org'],
    defaultEndpoint: {
      destination: 'example.com',
    },
    ...props,
  })
  const template = () => Template.fromStack(stack)
  return {
    api,
    template,
    stack,
  }
}

describe('edge-api', () => {
  describe('production', () => {
    test('synthesizes', () => {
      const { api } = synth('us-east-1', {})
      expect(api).toBeDefined()
    })
    test('synthesizes - unresolved region', () => {
      const app = new cdk.App()
      const stack = new cdk.Stack(app)
      const certificate = new Certificate(stack, 'certificate', {
        domainName: 'example.org',
      })
      expect(
        () =>
          new EdgeAPI(stack, 'api', {
            certificate,
            domains: ['example.org'],
            defaultEndpoint: {
              destination: 'example.com',
            },
          }),
      ).toThrowError('stack region must be explicitly specified')
    })
    test('synthesizes - bad region', () => {
      const app = new cdk.App()
      const stack = new cdk.Stack(app, 'stack', {
        env: {
          region: 'eu-west-2',
        },
      })
      const certificate = new Certificate(stack, 'certificate', {
        domainName: 'example.org',
      })
      expect(
        () =>
          new EdgeAPI(stack, 'api', {
            certificate,
            domains: ['example.org'],
            defaultEndpoint: {
              destination: 'example.com',
            },
          }),
      ).toThrowError('deploying non-devMode EdgeAPI to a region other than us-east-1 is not yet supported, sorry')
    })
    test('webAclId devMode', () => {
      const warnSpy = jest.spyOn(global.console, 'warn')
      synth('us-east-1', {
        devMode: true,
        webAclId: 'asdf',
      })
      expect(warnSpy).toHaveBeenCalledWith('devMode enabled, ignoring webAclId')
      warnSpy.mockRestore()
    })
    test('default endpoint', () => {
      const { template } = synth('us-east-1', {})
      const result = template()
      result.hasResource('AWS::CloudFront::CloudFrontOriginAccessIdentity', {})
      result.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          Aliases: ['example.org'],
          Origins: [
            {
              CustomOriginConfig: {
                OriginProtocolPolicy: 'https-only',
                OriginSSLProtocols: ['TLSv1.2'],
              },
              DomainName: 'example.com',
              Id: 'stackapiOrigin1254E9B8E',
            },
          ],
          DefaultCacheBehavior: {
            AllowedMethods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'PATCH', 'POST', 'DELETE'],
            CachePolicyId: '4135ea2d-6df8-44a3-9df3-4b5a84be39ad',
            Compress: true,
            LambdaFunctionAssociations: [
              {
                EventType: 'viewer-response',
                LambdaFunctionARN: {},
              },
            ],
            OriginRequestPolicyId: 'b689b0a8-53d0-40ab-baf2-68738e2966ac',
            TargetOriginId: 'stackapiOrigin1254E9B8E',
            ViewerProtocolPolicy: 'allow-all',
          },
        },
      })
    })
    test('add a frontend endpoint', () => {
      const { api, stack, template } = synth('us-east-1', {})
      api.addEndpoint({
        pathPattern: '/frontend',
        bucket: new Bucket(stack, 'bucket'),
      })
      const result = template()
      result.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          CacheBehaviors: [
            {
              AllowedMethods: ['GET', 'HEAD'],
              CachePolicyId: '4135ea2d-6df8-44a3-9df3-4b5a84be39ad',
              Compress: true,
              LambdaFunctionAssociations: [
                {
                  EventType: 'origin-response',
                  LambdaFunctionARN: {},
                },
              ],
              OriginRequestPolicyId: 'b689b0a8-53d0-40ab-baf2-68738e2966ac',
              PathPattern: '/frontend',
              TargetOriginId: 'stackapiOrigin236DC05AF',
              ViewerProtocolPolicy: 'allow-all',
            },
            {
              AllowedMethods: ['GET', 'HEAD'],
              CachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6',
              Compress: true,
              OriginRequestPolicyId: 'b689b0a8-53d0-40ab-baf2-68738e2966ac',
              PathPattern: '/frontend/*',
              TargetOriginId: 'stackapiOrigin236DC05AF',
              ViewerProtocolPolicy: 'allow-all',
            },
          ],
          Origins: [
            {},
            {
              DomainName: {
                'Fn::GetAtt': ['bucket43879C71', 'RegionalDomainName'],
              },
              Id: 'stackapiOrigin236DC05AF',
              S3OriginConfig: {
                OriginAccessIdentity: {
                  'Fn::Join': [
                    '',
                    [
                      'origin-access-identity/cloudfront/',
                      {
                        Ref: 'apioia76883CD0',
                      },
                    ],
                  ],
                },
              },
            },
          ],
        },
      })
    })
    test('add a lambda endpoint', () => {
      const { api, stack, template } = synth('us-east-1', {})
      api.addEndpoint({
        pathPattern: '/api/lambda',
        lambda: new EdgeAPILambda(stack, 'lambda', {
          code: Code.fromInline('export const handler = () => {}'),
          handler: 'index.handler',
          runtime: Runtime.NODEJS_18_X,
          environment: {
            aVariable: 'contents',
          },
        }),
      })

      const result = template()
      result.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          CacheBehaviors: [
            {
              AllowedMethods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'PATCH', 'POST', 'DELETE'],
              CachePolicyId: '4135ea2d-6df8-44a3-9df3-4b5a84be39ad',
              Compress: true,
              LambdaFunctionAssociations: [
                {
                  EventType: 'origin-request',
                  LambdaFunctionARN: {},
                },
              ],
              OriginRequestPolicyId: '216adef6-5c7f-47e4-b989-5492eafa07d3',
              PathPattern: '/api/lambda',
              TargetOriginId: 'stackapiOrigin236DC05AF',
              ViewerProtocolPolicy: 'allow-all',
            },
          ],
          Origins: [
            {},
            {
              DomainName: {
                'Fn::GetAtt': ['apibucketF0F7D0F9', 'RegionalDomainName'],
              },
              Id: 'stackapiOrigin236DC05AF',
              OriginCustomHeaders: [
                {
                  HeaderName: 'env',
                  HeaderValue: '{"aVariable":"contents"}',
                },
              ],
              S3OriginConfig: {
                OriginAccessIdentity: {
                  'Fn::Join': [
                    '',
                    [
                      'origin-access-identity/cloudfront/',
                      {
                        Ref: 'apioia76883CD0',
                      },
                    ],
                  ],
                },
              },
            },
          ],
        },
      })
    })
    test('add a lambda endpoint - GET only', () => {
      const { api, stack, template } = synth('us-east-1', {})
      api.addEndpoint({
        pathPattern: '/api/lambda',
        methods: [HttpMethod.GET],
        lambda: new EdgeAPILambda(stack, 'lambda', {
          code: Code.fromInline('export const handler = () => {}'),
          handler: 'index.handler',
          runtime: Runtime.NODEJS_18_X,
          environment: {
            aVariable: 'contents',
          },
        }),
      })

      const result = template()
      result.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          CacheBehaviors: [
            {
              AllowedMethods: ['GET', 'HEAD'],
            },
          ],
        },
      })
    })
    test('add a lambda endpoint - GET, HEAD', () => {
      const { api, stack, template } = synth('us-east-1', {})
      api.addEndpoint({
        pathPattern: '/api/lambda',
        methods: [HttpMethod.GET, HttpMethod.HEAD],
        lambda: new EdgeAPILambda(stack, 'lambda', {
          code: Code.fromInline('export const handler = () => {}'),
          handler: 'index.handler',
          runtime: Runtime.NODEJS_18_X,
          environment: {
            aVariable: 'contents',
          },
        }),
      })

      const result = template()
      result.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          CacheBehaviors: [
            {
              AllowedMethods: ['GET', 'HEAD'],
            },
          ],
        },
      })
    })

    test('add a lambda endpoint - GET, HEAD, OPTIONS', () => {
      const { api, stack, template } = synth('us-east-1', {})
      api.addEndpoint({
        pathPattern: '/api/lambda',
        methods: [HttpMethod.GET, HttpMethod.HEAD, HttpMethod.OPTIONS],
        lambda: new EdgeAPILambda(stack, 'lambda', {
          code: Code.fromInline('export const handler = () => {}'),
          handler: 'index.handler',
          runtime: Runtime.NODEJS_18_X,
          environment: {
            aVariable: 'contents',
          },
        }),
      })

      const result = template()
      result.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          CacheBehaviors: [
            {
              AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
            },
          ],
        },
      })
    })
    test('add a lambda endpoint - POST', () => {
      const { api, stack, template } = synth('us-east-1', {})
      api.addEndpoint({
        pathPattern: '/api/lambda',
        methods: [HttpMethod.POST],
        lambda: new EdgeAPILambda(stack, 'lambda', {
          code: Code.fromInline('export const handler = () => {}'),
          handler: 'index.handler',
          runtime: Runtime.NODEJS_18_X,
          environment: {
            aVariable: 'contents',
          },
        }),
      })

      const result = template()
      result.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          CacheBehaviors: [
            {
              AllowedMethods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'PATCH', 'POST', 'DELETE'],
            },
          ],
        },
      })
    })
    test('add a lambda endpoint - static', () => {
      const { api, stack, template } = synth('us-east-1', {})
      api.addEndpoint({
        pathPattern: '/api/lambda',
        methods: [HttpMethod.GET, HttpMethod.HEAD, HttpMethod.OPTIONS],
        static: true,
        lambda: new EdgeAPILambda(stack, 'lambda', {
          code: Code.fromInline('export const handler = () => {}'),
          handler: 'index.handler',
          runtime: Runtime.NODEJS_18_X,
          environment: {
            aVariable: 'contents',
          },
        }),
      })

      const result = template()
      result.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          CacheBehaviors: [
            {
              CachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6',
            },
          ],
        },
      })
    })
    test('add a proxy endpoint', () => {
      const { api, template } = synth('us-east-1', {})
      api.addEndpoint({
        pathPattern: '/google',
        destination: 'google.com',
      })
      const result = template()
      const CacheBehaviors = [
        {
          AllowedMethods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'PATCH', 'POST', 'DELETE'],
          CachePolicyId: '4135ea2d-6df8-44a3-9df3-4b5a84be39ad',
          Compress: true,
          LambdaFunctionAssociations: [
            {
              EventType: 'viewer-response',
              LambdaFunctionARN: {},
            },
          ],
          OriginRequestPolicyId: 'b689b0a8-53d0-40ab-baf2-68738e2966ac',
          PathPattern: '/google',
          TargetOriginId: 'stackapiOrigin236DC05AF',
          ViewerProtocolPolicy: 'allow-all',
        },
      ]

      const origin = {
        CustomOriginConfig: {
          OriginProtocolPolicy: 'https-only',
          OriginSSLProtocols: ['TLSv1.2'],
        },
        DomainName: 'google.com',
        Id: 'stackapiOrigin236DC05AF',
      }
      result.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          CacheBehaviors,
          Origins: [{}, origin],
        },
      })
    })

    test('add a proxy endpoint - disableBuiltInMiddlewares', () => {
      const { api, template } = synth('us-east-1', {})
      api.addEndpoint({
        pathPattern: '/google',
        destination: 'google.com',
        disableBuiltInMiddlewares: {
          cookie: true,
          redirect: true,
        },
      })
      const result = template()
      result.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          CacheBehaviors: [
            {
              LambdaFunctionAssociations: [
                {
                  EventType: 'viewer-response',
                  LambdaFunctionARN: {},
                },
              ],
            },
          ],
        },
      })
      const { apirewritergooglecom5166E1A0 } = result.findResources('AWS::Lambda::Function')
      const js = apirewritergooglecom5166E1A0.Properties.Code.ZipFile as string
      expect(js.includes('doCookieRewrite = false')).toBe(true)
      expect(js.includes('doRedirectRewrite = false')).toBe(true)
    })

    test('add a proxy endpoint - mapped destination string', () => {
      const { api, template } = synth('us-east-1', {
        domains: ['example.org', 'example.com.au'],
      })
      const destination = {
        'example.org': 'google.com',
        'example.com.au': 'google.com.au',
      }
      api.addEndpoint({
        pathPattern: '/google',
        destination,
      })
      const result = template()
      result.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          CacheBehaviors: [
            {
              LambdaFunctionAssociations: [
                {
                  EventType: 'viewer-request',
                },
                {
                  EventType: 'origin-request',
                },
                {
                  EventType: 'viewer-response',
                },
              ],
            },
          ],
          Origins: [
            {},
            {
              OriginCustomHeaders: [
                {
                  HeaderName: 'env',
                  HeaderValue: JSON.stringify({ domainMapping: destination }),
                },
              ],
            },
          ],
        },
      })
    })

    test('add a proxy endpoint - mapped destination object', () => {
      const { api, template } = synth('us-east-1', {
        domains: ['example.org', 'example.com.au'],
      })
      const destination = {
        'example.org': {
          destination: 'google.com',
        },
        'example.com.au': {
          destination: 'google.com.au',
        },
      }
      api.addEndpoint({
        pathPattern: '/google',
        destination,
      })
      const result = template()
      result.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          CacheBehaviors: [
            {
              LambdaFunctionAssociations: [
                {
                  EventType: 'viewer-request',
                },
                {
                  EventType: 'origin-request',
                },
                {
                  EventType: 'viewer-response',
                },
              ],
            },
          ],
          Origins: [
            {},
            {
              OriginCustomHeaders: [
                {
                  HeaderName: 'env',
                  HeaderValue: JSON.stringify({ domainMapping: destination }),
                },
              ],
            },
          ],
        },
      })
    })

    test('add a proxy endpoint - custom middleware', async () => {
      const { api, template } = synth('us-east-1', {
        domains: ['example.org', 'example.com.au'],
      })
      const destination = {
        'example.org': {
          destination: 'google.com',
          idpProviderName: 'a',
        },
        'example.com.au': {
          destination: 'google.com.au',
          idpProviderName: 'b',
        },
      }
      api.addEndpoint({
        pathPattern: '/google',
        destination,
        customMiddlewares: [
          (req, mapping) => {
            if (req.uri === '/authorize' || req.uri === '/login') {
              if (typeof mapping !== 'string') {
                const ip = `identity_provider=${mapping.idpProviderName}`
                if (req.querystring.length) {
                  req.querystring = `${ip}&${req.querystring}`
                } else {
                  req.querystring = ip
                }
              }
              req.uri = '/oauth2/authorize'
            }
          },
        ],
      })
      const result = template()
      result.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          CacheBehaviors: [
            {
              LambdaFunctionAssociations: [
                {
                  EventType: 'viewer-request',
                },
                {
                  EventType: 'origin-request',
                },
                {
                  EventType: 'viewer-response',
                },
              ],
            },
          ],
          Origins: [
            {},
            {
              OriginCustomHeaders: [
                {
                  HeaderName: 'env',
                  HeaderValue: JSON.stringify({ domainMapping: destination }),
                },
              ],
            },
          ],
        },
      })
      const lambdas = result.findResources('AWS::Lambda::Function')
      const code = Object.values(lambdas)
        .filter((lambda) => {
          return !!lambda.Properties.Code.ZipFile
        })
        .map((lambda) => lambda.Properties.Code.ZipFile)
        .find((code) => code.includes('identity_provider=${mapping.idpProviderName}'))

      const lambdaResult = await testGeneratedLambda(code, {
        Records: [
          {
            cf: {
              config: {
                distributionDomainName: '123',
                distributionId: '123',
                eventType: 'viewer-request',
                requestId: '123',
              },
              request: {
                clientIp: '1.1.1.1',
                headers: {
                  'req-host': [{ value: 'example.com.au' }],
                },
                method: 'GET',
                querystring: '',
                uri: '/authorize',
                origin: {
                  custom: {
                    domainName: '',
                    keepaliveTimeout: 1,
                    path: '',
                    port: 123,
                    protocol: 'https',
                    readTimeout: 3,
                    sslProtocols: [''],
                    customHeaders: {
                      env: [
                        {
                          value: JSON.stringify({ domainMapping: destination }),
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        ],
      })
      expect(lambdaResult.uri).toBe('/oauth2/authorize')
      expect(lambdaResult.querystring).toBe('identity_provider=b')
    })
  })
  describe('dev', () => {
    test('synthesizes', () => {
      const { api } = synth('us-east-1', { devMode: true })
      expect(api).toBeDefined()
    })
    test('default endpoint', () => {
      const { template } = synth('us-east-1', { devMode: true })
      const result = template()
      result.hasResource('AWS::ApiGatewayV2::Api', {})
      result.hasResourceProperties('AWS::ApiGatewayV2::Integration', {
        ApiId: {
          Ref: 'api215E4D4B',
        },
        IntegrationMethod: 'ANY',
        IntegrationType: 'HTTP_PROXY',
        IntegrationUri: 'example.com/{proxy}',
      })
      result.hasResourceProperties('AWS::ApiGatewayV2::DomainName', {
        DomainName: 'example.org',
        DomainNameConfigurations: [
          {
            CertificateArn: {
              Ref: 'certificateEC031123',
            },
            EndpointType: 'REGIONAL',
          },
        ],
      })
      result.hasResourceProperties('AWS::ApiGatewayV2::ApiMapping', {
        ApiId: {
          Ref: 'api215E4D4B',
        },
        DomainName: {
          Ref: 'apidomainexampleorg6A7B7EFC',
        },
        Stage: '$default',
      })
      result.hasResourceProperties('AWS::ApiGatewayV2::Route', {
        ApiId: {
          Ref: 'api215E4D4B',
        },
        AuthorizationType: 'NONE',
        RouteKey: 'ANY /{proxy+}',
        Target: {
          'Fn::Join': [
            '',
            [
              'integrations/',
              {
                Ref: 'apiANYproxyproxyintegration0A1C13F3',
              },
            ],
          ],
        },
      })
    })
    test('add a frontend endpoint', () => {
      const { api, stack, template } = synth('us-east-1', { devMode: true })
      api.addEndpoint({
        pathPattern: '/frontend',
        bucket: new Bucket(stack, 'bucket'),
      })
      const result = template()
      result.hasResourceProperties('AWS::ApiGatewayV2::Integration', {
        ApiId: {
          Ref: 'api215E4D4B',
        },
        IntegrationMethod: 'ANY',
        IntegrationType: 'HTTP_PROXY',
        IntegrationUri: {
          'Fn::Join': [
            '',
            [
              {
                'Fn::GetAtt': ['bucket43879C71', 'WebsiteURL'],
              },
              '/frontend/config.js',
            ],
          ],
        },
        PayloadFormatVersion: '1.0',
      })
      result.hasResourceProperties('AWS::ApiGatewayV2::Route', {
        ApiId: {
          Ref: 'api215E4D4B',
        },
        AuthorizationType: 'NONE',
        RouteKey: 'GET /frontend/config.js',
        Target: {
          'Fn::Join': [
            '',
            [
              'integrations/',
              {
                Ref: 'apiGETfrontendconfigjsproxyintegration69A14FD7',
              },
            ],
          ],
        },
      })
      result.hasResourceProperties('AWS::ApiGatewayV2::Route', {
        ApiId: {
          Ref: 'api215E4D4B',
        },
        AuthorizationType: 'NONE',
        RouteKey: 'GET /frontend/{proxy+}',
        Target: {
          'Fn::Join': [
            '',
            [
              'integrations/',
              {
                Ref: 'apiGETfrontendfrontendintegration2B7B880A',
              },
            ],
          ],
        },
      })
      result.hasResourceProperties('AWS::ApiGatewayV2::Route', {
        ApiId: {
          Ref: 'api215E4D4B',
        },
        AuthorizationType: 'NONE',
        RouteKey: 'GET /frontend',
        Target: {
          'Fn::Join': [
            '',
            [
              'integrations/',
              {
                Ref: 'apiGETfrontendfrontendintegration2B7B880A',
              },
            ],
          ],
        },
      })
      result.hasResourceProperties('AWS::ApiGatewayV2::Integration', {
        ApiId: {
          Ref: 'api215E4D4B',
        },
        IntegrationType: 'AWS_PROXY',
        IntegrationUri: {
          'Fn::GetAtt': ['apiredirect5F095797', 'Arn'],
        },
        PayloadFormatVersion: '2.0',
        RequestParameters: {
          'overwrite:header.env': {
            'Fn::Base64': {
              'Fn::Join': [
                '',
                [
                  '{"destination":"',
                  {
                    'Fn::GetAtt': ['bucket43879C71', 'WebsiteURL'],
                  },
                  '"}',
                ],
              ],
            },
          },
        },
      })
    })
    test('add a lambda endpoint', () => {
      const { api, stack, template } = synth('us-east-1', { devMode: true })
      api.addEndpoint({
        pathPattern: '/api/lambda',
        lambda: new EdgeAPILambda(stack, 'lambda', {
          code: Code.fromInline('export const handler = () => {}'),
          handler: 'index.handler',
          runtime: Runtime.NODEJS_18_X,
          environment: {
            aVariable: 'contents',
          },
        }),
      })
      const result = template()
      result.hasResourceProperties('AWS::ApiGatewayV2::Route', {
        ApiId: {
          Ref: 'api215E4D4B',
        },
        AuthorizationType: 'NONE',
        RouteKey: 'ANY /api/lambda',
        Target: {
          'Fn::Join': [
            '',
            [
              'integrations/',
              {
                Ref: 'apiANYapilambdaapilambdaintegrationC59C0038',
              },
            ],
          ],
        },
      })
      result.hasResourceProperties('AWS::ApiGatewayV2::Integration', {
        ApiId: {
          Ref: 'api215E4D4B',
        },
        IntegrationType: 'AWS_PROXY',
        IntegrationUri: {
          'Fn::GetAtt': ['lambda8B5974B5', 'Arn'],
        },
        PayloadFormatVersion: '2.0',
        RequestParameters: {
          'overwrite:header.env': {
            'Fn::Base64': '{"aVariable":"contents"}',
          },
        },
      })
    })
    test('add a proxy endpoint', () => {
      const { api, template } = synth('us-east-1', { devMode: true })
      api.addEndpoint({
        pathPattern: '/google',
        destination: 'google.com',
      })
      const result = template()
      result.hasResourceProperties('AWS::ApiGatewayV2::Route', {
        ApiId: {
          Ref: 'api215E4D4B',
        },
        AuthorizationType: 'NONE',
        RouteKey: 'ANY /google',
        Target: {
          'Fn::Join': [
            '',
            [
              'integrations/',
              {
                Ref: 'apiANYgoogleproxyintegration834AF96D',
              },
            ],
          ],
        },
      })
      result.hasResourceProperties('AWS::ApiGatewayV2::Integration', {
        ApiId: {
          Ref: 'api215E4D4B',
        },
        IntegrationMethod: 'ANY',
        IntegrationType: 'HTTP_PROXY',
        IntegrationUri: 'google.com/{proxy}',
        PayloadFormatVersion: '1.0',
      })
    })
  })
})
