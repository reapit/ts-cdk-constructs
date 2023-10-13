import { Arn, ArnFormat, CustomResource, Duration, PhysicalName, Stack, Token } from 'aws-cdk-lib'
import { ISecret, Secret } from 'aws-cdk-lib/aws-secretsmanager'
import { Construct, IDependable } from 'constructs'
import { ReplicatedKey } from '@reapit-cdk/replicated-key'
import { Grant, IGrantable, PolicyStatement } from 'aws-cdk-lib/aws-iam'
import { Provider } from 'aws-cdk-lib/custom-resources'
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda'
import * as path from 'path'

export interface MultiRegionSecretProps {
  readonly replicatedKey: ReplicatedKey
  readonly replicaRegions: string[]
}

const secretArnToNameWithSuffix = (secret: ISecret) => {
  const { resourceName } = Arn.split(secret.secretArn, ArnFormat.COLON_RESOURCE_NAME)
  if (!resourceName) {
    throw new Error('resourceName undefined')
  }
  return resourceName
}

const secretReplicaArn = (secret: ISecret, replicaRegion: string) => {
  return Arn.format(
    {
      region: replicaRegion,
      resource: 'secret',
      service: 'secretsmanager',
      resourceName: secretArnToNameWithSuffix(secret),
      arnFormat: ArnFormat.COLON_RESOURCE_NAME,
    },
    Stack.of(secret),
  )
}

export class ReplicatedSecret extends Secret {
  private secrets: Partial<Record<string, ISecret>> = {}
  private replicatedKey: ReplicatedKey
  masterRegion: string
  dependable: IDependable

  constructor(scope: Construct, id: string, props: MultiRegionSecretProps) {
    const stackRegion = Stack.of(scope).region

    if (Token.isUnresolved(stackRegion)) {
      throw new Error('stack region is not resolved, please be explicit')
    }

    const { replicatedKey, replicaRegions } = props
    const masterKey = replicatedKey.tryGetRegionalKey(stackRegion)
    if (!masterKey) {
      throw new Error('attempted to create replicated secret with no key available in secret primary region')
    }

    super(scope, id, {
      secretName: PhysicalName.GENERATE_IF_NEEDED,
      encryptionKey: masterKey,
      replicaRegions: replicaRegions.map((region) => {
        const encryptionKey = replicatedKey.getRegionalKey(region)
        if (!encryptionKey) {
          throw new Error('attempted to replicate secret into region key is not replicated to: ' + region)
        }
        return {
          region,
          encryptionKey,
        }
      }),
    })

    this.masterRegion = stackRegion
    this.replicatedKey = replicatedKey
    this.node.addDependency(replicatedKey.dependable)
    props.replicaRegions.forEach((replicaRegion) => {
      this.secrets[replicaRegion] = Secret.fromSecretCompleteArn(
        this,
        `${replicaRegion}-replica-secret`,
        secretReplicaArn(this, replicaRegion),
      )
    })

    const lambda = new Function(this, 'lambda', {
      code: Code.fromAsset(path.join(__dirname, '..', 'dist', 'lambda')),
      handler: 'lambda.onEvent',
      runtime: Runtime.NODEJS_18_X,
      timeout: Duration.minutes(15),
    })

    lambda.addToRolePolicy(
      new PolicyStatement({
        actions: ['secretsmanager:DescribeSecret'],
        resources: [this.secretArn],
      }),
    )

    const provider = new Provider(this, 'provider', {
      onEventHandler: lambda,
    })
    this.dependable = new CustomResource(this, 'wait-for-replication', {
      serviceToken: provider.serviceToken,
      properties: {
        secretArn: this.secretArn,
        regions: props.replicaRegions,
      },
    })
  }

  getRegionalSecret(region: string): ISecret {
    const secret = this.secrets[region]
    if (region === this.masterRegion) {
      return this
    }
    if (!secret) {
      throw new Error('No secret in region ' + region)
    }
    return secret
  }

  grantWrite(grantee: IGrantable): Grant {
    Object.values(this.secrets).forEach((secret) => {
      secret?.grantWrite(grantee)
    })
    this.replicatedKey.grantEncryptDecrypt(grantee)
    return super.grantWrite(grantee)
  }

  grantRead(grantee: IGrantable): Grant {
    Object.values(this.secrets).forEach((secret) => {
      secret?.grantRead(grantee)
    })
    this.replicatedKey.grantDecrypt(grantee)
    return super.grantRead(grantee)
  }
}
