export const awsRegions = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'us-gov-west-1',
  'us-gov-east-1',
  'ca-central-1',
  'eu-north-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'eu-south-1',
  'af-south-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-northeast-3',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-southeast-3',
  'ap-east-1',
  'ap-south-1',
  'ap-south-2',
  'sa-east-1',
  'me-south-1',
  'cn-north-1',
  'cn-northwest-1',
] as const

export type AWSRegion = (typeof awsRegions)[number]

export const stringIsAWSRegion = (str: string): str is AWSRegion => awsRegions.includes(str as AWSRegion)
