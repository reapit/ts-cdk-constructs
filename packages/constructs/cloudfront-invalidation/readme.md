# @reapit-cdk/cloudfront-invalidation
CloudFront invalidations are [very error prone](https://github.com/aws/aws-cdk/issues/15891#issuecomment-966456154), making it hard to invalidate distributions reliably. This construct aims to solve this problem by using a step function which is triggered on stack update, and uses exponential backoff to retry the invalidation.

Inspired by https://github.com/aws/aws-cdk/issues/15891#issuecomment-1362163142.

## npm Package Installation:
```sh
yarn add --dev @reapit-cdk/cloudfront-invalidation
# or
npm install @reapit-cdk/cloudfront-invalidation --save-dev
```

## Usage
```ts

```