import { AWSRegion } from "@reapit-cdk/common"

export const generateKeyPolicy = (account: string, region: AWSRegion) => {
  return {
    Id: 'auto-secretsmanager-2',
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'Allow access through AWS Secrets Manager for all principals in the account that are authorized to use AWS Secrets Manager',
        Effect: 'Allow',
        Principal: {
          AWS: ['*'],
        },
        Action: ['kms:Encrypt', 'kms:Decrypt', 'kms:ReEncrypt*', 'kms:CreateGrant', 'kms:DescribeKey'],
        Resource: '*',
        Condition: {
          StringEquals: {
            'kms:CallerAccount': account,
            'kms:ViaService': `secretsmanager.${region}.amazonaws.com`,
          },
        },
      },
      {
        Sid: 'Allow access through AWS Secrets Manager for all principals in the account that are authorized to use AWS Secrets Manager',
        Effect: 'Allow',
        Principal: {
          AWS: ['*'],
        },
        Action: 'kms:GenerateDataKey*',
        Resource: '*',
        Condition: {
          StringEquals: {
            'kms:CallerAccount': account,
          },
          StringLike: {
            'kms:ViaService': `secretsmanager.${region}.amazonaws.com`,
          },
        },
      },
      {
        Sid: 'Allow direct access to key to the account',
        Effect: 'Allow',
        Principal: {
          AWS: [`arn:aws:iam::${account}:root`],
        },
        Action: ['kms:*'],
        Resource: '*',
      },
    ],
  }
}
