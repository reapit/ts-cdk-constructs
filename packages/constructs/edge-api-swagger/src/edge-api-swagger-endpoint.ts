import { EdgeAPI, FrontendEndpoint, endpointIsLambdaEndpoint, endpointIsProxyEndpoint } from '@reapit-cdk/edge-api'
import { Construct } from 'constructs'

import { Bucket } from 'aws-cdk-lib/aws-s3'
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment'
import { RemovalPolicy } from 'aws-cdk-lib'
import { generateOpenAPIDocs } from './generation/generate-openapi-docs'
import { EndpointInputItem } from './generation'
import { getAbsoluteFSPath } from 'swagger-ui-dist'
import { InfoObject } from 'openapi3-ts/oas30'

export type { IFrontendEndpoint } from '@reapit-cdk/edge-api'

export interface EdgeAPISwaggerEndpointProps {
  readonly api: EdgeAPI
  readonly url: string
  readonly pathPattern?: string
  /**
   * @jsii ignore
   */
  readonly info?: InfoObject
  readonly repoRoot?: string
}

const swaggerHtml = (urlPrefix: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta
    name="description"
    content="SwaggerUI"
  />
  <title>SwaggerUI</title>
  <link rel="stylesheet" href="${urlPrefix}/swagger-ui.css" />
</head>
<body>
<div id="swagger-ui"></div>
<script src="${urlPrefix}/swagger-ui-bundle.js" crossorigin></script>
<script src="${urlPrefix}/swagger-ui-standalone-preset.js" crossorigin></script>
<script>
  window.onload = () => {
    window.ui = SwaggerUIBundle({
      url: '${urlPrefix}/openapi.json',
      dom_id: '#swagger-ui',
    });
  };
</script>
</body>
</html>`

export class EdgeAPISwaggerEndpoint extends Construct {
  bucket: Bucket
  invalidationItems: string[] | undefined = [
    '/index.html',
    '/openapi.json',
    '/swagger-ui-bundle.js',
    '/swagger-ui-standalone-preset.js',
    '/swagger-ui.css',
  ]
  pathPattern: string
  endpoint: FrontendEndpoint

  constructor(scope: Construct, id: string, props: EdgeAPISwaggerEndpointProps) {
    super(scope, id)
    this.pathPattern = props.pathPattern ?? '/swagger'

    const destinationKeyPrefix = this.pathPattern.replace(/^\/+/g, '')

    this.bucket = new Bucket(this, 'bucket', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: destinationKeyPrefix + '/index.html',
      removalPolicy: RemovalPolicy.RETAIN, // otherwise deletion will fail on stack destroy due to non-empty bucket
      publicReadAccess: true,
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
    })

    console.log('edge-api: Generating OpenAPI documentation...')
    const openapiJson = generateOpenAPIDocs({
      url: props.url,
      info: props.info,
      repoRoot: props.repoRoot,
      endpointsInput: props.api._endpoints.map((endpoint): EndpointInputItem => {
        if (endpointIsLambdaEndpoint(endpoint)) {
          return {
            codePath: endpoint.lambdaFunction.codePath,
            pathPattern: endpoint.pathPattern,
            isFrontend: false,
          }
        }
        if (endpointIsProxyEndpoint(endpoint)) {
          return {
            isProxy: true,
            pathPattern: endpoint.pathPattern,
            proxyDestination: endpoint.destination,
          }
        }
        return {
          pathPattern: endpoint.pathPattern,
          isFrontend: true,
        }
      }),
    })
    console.log('edge-api: Generated OpenAPI documentation.')

    new BucketDeployment(this, 'deployment', {
      sources: [
        Source.asset(getAbsoluteFSPath(), {
          exclude: ['index.html'],
        }),
        Source.data('index.html', swaggerHtml(`${props.url}/${destinationKeyPrefix}`)),
        Source.jsonData('openapi.json', openapiJson),
      ],
      destinationBucket: this.bucket,
      destinationKeyPrefix,
      retainOnDelete: false,
    })

    this.endpoint = new FrontendEndpoint(this)
  }
}
