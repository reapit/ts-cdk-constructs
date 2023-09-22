import { Arn, CustomResource, Duration, Stack, Token } from 'aws-cdk-lib'
import { PolicyDocument, PolicyStatement, IGrantable } from 'aws-cdk-lib/aws-iam'
import { CfnKey, IKey, Key } from 'aws-cdk-lib/aws-kms'
import { Provider } from 'aws-cdk-lib/custom-resources'
import { Construct, IDependable } from 'constructs'
import { generateKeyPolicy } from './generate-key-policy'
import { AWSRegion, stringIsAWSRegion } from '@reapit-cdk/common'
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda'
import * as path from 'path'

export class ReplicatedKey extends Construct {
  private masterKey: IKey
  private keys: Partial<Record<AWSRegion, IKey>> = {}
  dependable: IDependable

  constructor(scope: Construct, id: string, props: { replicaRegions: AWSRegion[] }) {
    super(scope, id)
    const stack = Stack.of(this)
    const masterRegion = stack.region
    if (Token.isUnresolved(masterRegion)) {
      throw new Error('stack region is unresolved, please explicitly specify')
    }
    if (!stringIsAWSRegion(masterRegion)) {
      throw new Error('region is not valid')
    }
    const cfnKey = new CfnKey(this, 'resource', {
      multiRegion: true,
      keyPolicy: PolicyDocument.fromJson(generateKeyPolicy(stack.account, masterRegion)),
    })

    this.masterKey = Key.fromKeyArn(this, 'master-key', cfnKey.attrArn)
    this.keys[masterRegion] = this.masterKey
    const { replicaRegions } = props

    const lambda = new Function(this, 'lambda', {
      code: Code.fromAsset(path.join(__dirname, 'lambda')),
      handler: 'lambda.onEvent',
      runtime: Runtime.NODEJS_18_X,
      timeout: Duration.minutes(15),
    })

    const rr = replicaRegions.filter((region) => region !== masterRegion)
    this.masterKey.grant(lambda, 'kms:DescribeKey', 'kms:ReplicateKey')
    lambda.addToRolePolicy(
      new PolicyStatement({
        actions: ['kms:CreateKey'],
        resources: ['*'],
      }),
    )

    lambda.addToRolePolicy(
      new PolicyStatement({
        actions: ['kms:DescribeKey', 'kms:ScheduleKeyDeletion', 'kms:CancelKeyDeletion', 'kms:PutKeyPolicy'],
        resources: rr.map((region) => this.getReplicaArn(region)),
      }),
    )

    const provider = new Provider(this, 'provider', {
      onEventHandler: lambda,
    })

    this.dependable = new CustomResource(this, 'custom-resource', {
      serviceToken: provider.serviceToken,
      properties: {
        regions: rr,
        keyArn: cfnKey.attrArn,
      },
    })

    rr.forEach((region) => {
      const replica = Key.fromKeyArn(this, `replica-${region}`, this.getReplicaArn(region))
      replica.node.addDependency(this.dependable)
      this.keys[region] = replica
    })
  }

  grantDecrypt(grantee: IGrantable) {
    Object.values(this.keys).forEach((key) => {
      key.grantDecrypt(grantee)
    })
  }
  grantEncrypt(grantee: IGrantable) {
    Object.values(this.keys).forEach((key) => {
      key.grantEncrypt(grantee)
    })
  }
  grantEncryptDecrypt(grantee: IGrantable) {
    Object.values(this.keys).forEach((key) => {
      key.grantEncryptDecrypt(grantee)
    })
  }

  getRegionalKey(region: AWSRegion): IKey {
    const key = this.keys[region]
    if (!key) {
      throw new Error('No key in region ' + region)
    }
    return key
  }

  private getReplicaArn(region: AWSRegion) {
    return Arn.format(
      {
        region,
        service: 'kms',
        resource: `key/${this.masterKey.keyId}`,
      },
      Stack.of(this),
    )
  }
}
