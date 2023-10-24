import { getParameters } from './get-parameters'
import { customResourceWrapper } from '@reapit-cdk/custom-resource-wrapper'

export const onEvent = customResourceWrapper({
  onCreate: ({ stackName, regionName, parameterPath, role }) =>
    getParameters(regionName, parameterPath, role, stackName),
  onUpdate: ({ stackName, regionName, parameterPath, role }) =>
    getParameters(regionName, parameterPath, role, stackName),
})
