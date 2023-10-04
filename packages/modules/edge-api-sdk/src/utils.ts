import { stringIsAWSRegion } from '../../common/src'

export const getEnvRegion = () => {
  const region = process.env.AWS_REGION
  if (!region) {
    throw new Error('No AWS_REGION specified')
  }
  if (!stringIsAWSRegion(region)) {
    throw new Error(`Unknown region ${region}`)
  }

  return {
    region,
  }
}
