import { PhysicalName, Stack, Token } from 'aws-cdk-lib'
import { AccountPrincipal, ManagedPolicy, Role } from 'aws-cdk-lib/aws-iam'
import { StringParameter } from 'aws-cdk-lib/aws-ssm'
import { RemoteParameters } from './remote-parameters'
import { Construct } from 'constructs'

export class CrossRegionStackImport<ExportKey> extends Construct {
  exporter: CrossRegionStackExport<ExportKey>
  parameters: RemoteParameters
  constructor(scope: Construct, id: string, fromExporter: CrossRegionStackExport<ExportKey>, roleArn: string) {
    super(scope, id)
    this.exporter = fromExporter

    const stack = Stack.of(this)
    this.parameters = new RemoteParameters(this, 'parameters', {
      path: this.exporter.parameterPath,
      region: this.exporter.sourceStack.region,
      role: Role.fromRoleArn(this, 'readOnlyRole', roleArn),
    })
    stack.addDependency(this.exporter.sourceStack)
  }

  getValue(stackExport: ExportKey | string) {
    return this.parameters.get(this.exporter.getParameterName(stackExport))
  }
}

export class CrossRegionStackExport<ExportKey> extends Construct {
  parameterPath: string
  sourceStack: Stack

  constructor(scope: Construct, id: string) {
    super(scope, id)
    const stack = Stack.of(scope)
    this.sourceStack = stack
    if (Token.isUnresolved(stack.account)) {
      throw new Error('stack account is unresolved')
    }
    if (Token.isUnresolved(stack.region)) {
      throw new Error('stack region is unresolved')
    }
    this.parameterPath = `/${stack.account}/${stack.region}/${stack.stackName}/exports`
  }

  getParameterName(stackExport: ExportKey | string) {
    return `${this.parameterPath}/${stackExport}`
  }

  setValue(id: ExportKey | string, value: string) {
    new StringParameter(this, id as string, {
      parameterName: this.getParameterName(id),
      stringValue: value,
    })
  }

  getImporter(scope: Construct, id: string) {
    const { account } = Stack.of(scope)
    const cdkReadOnlyRole = new Role(this, `${account}-readOnlyRole`, {
      assumedBy: new AccountPrincipal(account),
      roleName: PhysicalName.GENERATE_IF_NEEDED,
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMReadOnlyAccess')],
    })
    return new CrossRegionStackImport<ExportKey>(scope, id, this, cdkReadOnlyRole.roleArn)
  }
}
