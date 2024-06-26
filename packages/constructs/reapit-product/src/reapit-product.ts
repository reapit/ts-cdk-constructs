import { Construct } from 'constructs'
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda'
import { Provider } from 'aws-cdk-lib/custom-resources'
import { CustomResource, Duration, Token, TokenComparison, Fn, Stack } from 'aws-cdk-lib'
import * as path from 'path'
import { IRestApi } from 'aws-cdk-lib/aws-apigateway'
import { PolicyStatement } from 'aws-cdk-lib/aws-iam'
import { ReapitProduct, ProductModel } from './types'
export type { ReapitProduct, ProductModel } from './types'

export interface ReapitProductProviderProps {
  readonly organisationsServiceApiGateway: IRestApi
  readonly stageName: string
}

export class ReapitProductProvider extends Construct {
  provider: Provider

  constructor(scope: Construct, id: string, props: ReapitProductProviderProps) {
    super(scope, id)

    const { organisationsServiceApiGateway, stageName } = props

    const endpoint = '/organisations/Products'

    const lambda = new Function(this, 'lambda', {
      handler: 'lambda.onEvent',
      timeout: Duration.seconds(60),
      runtime: Runtime.NODEJS_18_X,
      code: Code.fromAsset(path.join(__dirname, '..', 'dist', 'lambda')),
      environment: {
        ORGANISATIONS_SERVICE_PRODUCTS_URL: `https://${organisationsServiceApiGateway.restApiId}.execute-api.${
          Stack.of(this).region
        }.amazonaws.com/${stageName}${endpoint}`,
      },
    })
    lambda.addToRolePolicy(
      new PolicyStatement({
        actions: ['execute-api:Invoke'],
        resources: [
          organisationsServiceApiGateway.arnForExecuteApi('POST', endpoint, stageName),
          organisationsServiceApiGateway.arnForExecuteApi('PUT', `${endpoint}/*`, stageName),
          organisationsServiceApiGateway.arnForExecuteApi('GET', `${endpoint}/*`, stageName),
        ],
      }),
    )
    this.provider = new Provider(this, 'provider', {
      onEventHandler: lambda,
    })
  }

  createProduct(scope: Construct, id: string, product: ReapitProduct): ProductModel {
    const cr = new CustomResource(scope, id, {
      serviceToken: this.provider.serviceToken,
      properties: product,
    })

    const getAttString = (att: keyof ProductModel) => cr.getAttString(att)

    return {
      id: getAttString('id'),
      authFlow: getAttString('authFlow'),
      created: getAttString('created'),
      externalId: getAttString('externalId'),
      scopes: Fn.split(',', getAttString('scopes')),
      isInternalApp: Token.compareStrings(getAttString('isInternalApp'), 'true') === TokenComparison.SAME,
      name: getAttString('name'),
      usageKeyId: getAttString('usageKeyId'),
    }
  }
}
