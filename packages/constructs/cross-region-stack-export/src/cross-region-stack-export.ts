import { PhysicalName, Stack, Token } from 'aws-cdk-lib'
import { AccountPrincipal, ManagedPolicy, Role } from 'aws-cdk-lib/aws-iam'
import { StringParameter } from 'aws-cdk-lib/aws-ssm'
import { RemoteParameters } from './remote-parameters'
import { Construct } from 'constructs'

export class CrossRegionStackImport extends Construct {
  exporter: CrossRegionStackExport
  parameters: RemoteParameters
  constructor(scope: Construct, id: string, fromExporter: CrossRegionStackExport, roleArn: string, alwaysUpdate?: boolean) {
    super(scope, id)
    this.exporter = fromExporter

    const stack = Stack.of(this)
    this.parameters = new RemoteParameters(this, 'parameters', {
      path: this.exporter.parameterPath,
      region: this.exporter.sourceStack.region,
      role: Role.fromRoleArn(this, 'readOnlyRole', roleArn),
      alwaysUpdate,
    })
    stack.addDependency(this.exporter.sourceStack)
  }

  getValue(stackExport: string) {
    return this.parameters.get(this.exporter.getParameterName(stackExport))
  }
}

export class CrossRegionStackExport extends Construct {
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

  getParameterName(stackExport: string) {
    return `${this.parameterPath}/${stackExport}`
  }

  setValue(id: string, value: string) {
    new StringParameter(this, id as string, {
      parameterName: this.getParameterName(id),
      stringValue: value,
    })
  }

  private roleCache: Record<string, Role> = {}
  getReadOnlyRole(account: string) {
    if (!this.roleCache[account]) {
      this.roleCache[account] = new Role(this, `${account}-readOnlyRole`, {
        assumedBy: new AccountPrincipal(account),
        roleName: PhysicalName.GENERATE_IF_NEEDED,
        managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMReadOnlyAccess')],
      })
    }

    return this.roleCache[account]
  }

  getImporter(scope: Construct, id: string, alwaysUpdate?: boolean) {
    const { account } = Stack.of(scope)
    
    const cdkReadOnlyRole = this.getReadOnlyRole(account)
    return new CrossRegionStackImport(scope, id, this, cdkReadOnlyRole.roleArn, alwaysUpdate)
  }
}
