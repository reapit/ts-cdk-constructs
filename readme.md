# @reapit-cdk/ts-constructs
![coverage: 93.09%25](https://img.shields.io/badge/coverage-93.09%25-green)
CDK Constructs Monorepo
## Constructs

<details open>

<summary>Packages</summary>

<h3><a href="packages/constructs/active-ruleset">@reapit-cdk/active-ruleset</a></h3>

![npm version](https://img.shields.io/npm/v/@reapit-cdk/active-ruleset)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/active-ruleset)
![coverage: 99.02%25](https://img.shields.io/badge/coverage-99.02%25-green)
![Integ Tests: ✔](https://img.shields.io/badge/Integ%20Tests-%E2%9C%94-green)

This construct returns the currently active SES receipt RuleSet, or creates one. This enables you to add rules to it.
<h3><a href="packages/constructs/cloudfront-invalidation">@reapit-cdk/cloudfront-invalidation</a></h3>

![npm version](https://img.shields.io/npm/v/@reapit-cdk/cloudfront-invalidation)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/cloudfront-invalidation)
![coverage: 99.02%25](https://img.shields.io/badge/coverage-99.02%25-green)
![Integ Tests: ✔](https://img.shields.io/badge/Integ%20Tests-%E2%9C%94-green)

CloudFront invalidations are [very error prone](https://github.com/aws/aws-cdk/issues/15891#issuecomment-966456154), making it hard to invalidate distributions reliably. This construct aims to solve this problem by using a step function which is triggered on stack update, and uses exponential backoff to retry the invalidation. Inspired by https://github.com/aws/aws-cdk/issues/15891#issuecomment-1362163142.
<h3><a href="packages/constructs/cross-region-stack-export">@reapit-cdk/cross-region-stack-export</a></h3>

![npm version](https://img.shields.io/npm/v/@reapit-cdk/cross-region-stack-export)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/cross-region-stack-export)
![coverage: 74.02%25](https://img.shields.io/badge/coverage-74.02%25-orange)
![Integ Tests: X](https://img.shields.io/badge/Integ%20Tests-X-red)

Allows you to share values between stack across regions and accounts.
<h3><a href="packages/constructs/edge-api">@reapit-cdk/edge-api</a></h3>

![npm version](https://img.shields.io/npm/v/@reapit-cdk/edge-api)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/edge-api)
![coverage: 95.19%25](https://img.shields.io/badge/coverage-95.19%25-green)
![Integ Tests: ✔](https://img.shields.io/badge/Integ%20Tests-%E2%9C%94-green)

This construct creates a truly globally available API where code executes at the edge. Because changes take a long time to propagate to all edge locations, there is a `devMode` flag which will instead deploy your API to a [HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html). This is compatible with hotswapping, so [`cdk watch`](https://docs.aws.amazon.com/cdk/v2/guide/cli.html#cli-deploy-watch) works very well. In order to make it easy to develop APIs which handle both event formats and work around the environment variable limitation, I recommend you use the lightweight request wrapper [@reapit-cdk/edge-api-sdk](../../modules/edge-api-sdk) which normalises the event format and offers some extra helpers.
<h3><a href="packages/constructs/edge-api-swagger">@reapit-cdk/edge-api-swagger</a></h3>

![npm version](https://img.shields.io/npm/v/@reapit-cdk/edge-api-swagger)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/edge-api-swagger)
![coverage: 0%25](https://img.shields.io/badge/coverage-0%25-red)
![Integ Tests: X](https://img.shields.io/badge/Integ%20Tests-X-red)

Add a swagger endpoint to your EdgeAPI
<h3><a href="packages/constructs/email-receiver">@reapit-cdk/email-receiver</a></h3>

![npm version](https://img.shields.io/npm/v/@reapit-cdk/email-receiver)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/email-receiver)
![coverage: 99.02%25](https://img.shields.io/badge/coverage-99.02%25-green)
![Integ Tests: ✔](https://img.shields.io/badge/Integ%20Tests-%E2%9C%94-green)

This construct sets up everything necessary to receive email. The emails get stored in a dynamodb table, queryable by recipient. This is designed to be used in end-to-end tests, with the [@reapit-cdk/email-receiver-client](../../libs/email-receiver-client) helper library.
<h3><a href="packages/constructs/entra-id-application">@reapit-cdk/entra-id-application</a></h3>

![npm version](https://img.shields.io/npm/v/@reapit-cdk/entra-id-application)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/entra-id-application)
![coverage: 0%25](https://img.shields.io/badge/coverage-0%25-red)
![Integ Tests: X](https://img.shields.io/badge/Integ%20Tests-X-red)

This construct creates and manages a Microsoft Entra ID Application
<h3><a href="packages/constructs/reapit-product">@reapit-cdk/reapit-product</a></h3>

![npm version](https://img.shields.io/npm/v/@reapit-cdk/reapit-product)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/reapit-product)
![coverage: 0%25](https://img.shields.io/badge/coverage-0%25-red)
![Integ Tests: X](https://img.shields.io/badge/Integ%20Tests-X-red)

Creates a product in the organisations service
<h3><a href="packages/constructs/replicated-key">@reapit-cdk/replicated-key</a></h3>

![npm version](https://img.shields.io/npm/v/@reapit-cdk/replicated-key)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/replicated-key)
![coverage: 99.02%25](https://img.shields.io/badge/coverage-99.02%25-green)
![Integ Tests: ✔](https://img.shields.io/badge/Integ%20Tests-%E2%9C%94-green)

Creates a KMS key and replicates it to the desired regions. Useful when replicating secrets across regions.
<h3><a href="packages/constructs/replicated-secret">@reapit-cdk/replicated-secret</a></h3>

![npm version](https://img.shields.io/npm/v/@reapit-cdk/replicated-secret)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/replicated-secret)
![coverage: 97.06%25](https://img.shields.io/badge/coverage-97.06%25-green)
![Integ Tests: ✔](https://img.shields.io/badge/Integ%20Tests-%E2%9C%94-green)

Creates a Secret and replicates it across the given regions. Requires a [ReplicatedKey](../replicated-key/readme.md) be passed in.
<h3><a href="packages/constructs/userpool-domain">@reapit-cdk/userpool-domain</a></h3>

![npm version](https://img.shields.io/npm/v/@reapit-cdk/userpool-domain)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/userpool-domain)
![coverage: 99.02%25](https://img.shields.io/badge/coverage-99.02%25-green)
![Integ Tests: ✔](https://img.shields.io/badge/Integ%20Tests-%E2%9C%94-green)

This construct returns the given Cognito UserPool's UserPoolDomain, or creates one. This resolves an issue with [AWS::Cognito::UserPoolDomain](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cognito-userpooldomain.html), since that will fail if one already exists.
<h3><a href="packages/constructs/wildcard-certificate">@reapit-cdk/wildcard-certificate</a></h3>

![npm version](https://img.shields.io/npm/v/@reapit-cdk/wildcard-certificate)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/wildcard-certificate)
![coverage: 97.89%25](https://img.shields.io/badge/coverage-97.89%25-green)
![Integ Tests: ✔](https://img.shields.io/badge/Integ%20Tests-%E2%9C%94-green)

This construct returns a wildcard certificate valid for subdomains of the given domain names, creating and validating on if it doesn't exist. It supports cross-account DNS validation, you can pass in arns of roles from other accounts and it'll assume them whilst doing the Route53 updates.

</details>


## Modules

<details open>

<summary>Packages</summary>

<h3><a href="packages/modules/custom-resource-wrapper">@reapit-cdk/custom-resource-wrapper</a></h3>

![npm version](https://img.shields.io/npm/v/@reapit-cdk/custom-resource-wrapper)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/custom-resource-wrapper)
![coverage: 99.02%25](https://img.shields.io/badge/coverage-99.02%25-green)

This module helps write custom resource handlers. It's designed to work with the [Custom Resource Provider Framework](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.CustomResource.html). It accepts an object which contains event handlers for `onCreate`, and optionally, `onUpdate`, and `onDelete`. Anything returned from `onCreate` and `onUpdate` is returned as data attributes on the resulting custom resource.
<h3><a href="packages/modules/edge-api-sdk">@reapit-cdk/edge-api-sdk</a></h3>

![npm version](https://img.shields.io/npm/v/@reapit-cdk/edge-api-sdk)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/edge-api-sdk)
![coverage: 96.68%25](https://img.shields.io/badge/coverage-96.68%25-green)

Provides convenience wrappers for accepting and responding to [@reapit-cdk/edge-api]('../../constructs/edge-api/readme.md') lambda requests.
<h3><a href="packages/modules/email-receiver-client">@reapit-cdk/email-receiver-client</a></h3>

![npm version](https://img.shields.io/npm/v/@reapit-cdk/email-receiver-client)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/email-receiver-client)
![coverage: 99.02%25](https://img.shields.io/badge/coverage-99.02%25-green)

This module helps you write tests which rely on receiving emails. Once you have set up [@reapit-cdk/email-receiver](../../constructs/email-receiver/), this module helps you interact with the dynamodb table it creates. You'll have to export the table arn and domain name from your stack and import them to be used here, using [something like this](https://gist.github.com/joshbalfour/c0deb95f1e5938434ed6f6117dec8662).
<h3><a href="packages/modules/email-receiver-types">@reapit-cdk/email-receiver-types</a></h3>

![npm version](https://img.shields.io/npm/v/@reapit-cdk/email-receiver-types)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/email-receiver-types)
![coverage: 0%25](https://img.shields.io/badge/coverage-0%25-red)

Types for @reapit-cdk/email-receiver and client.

</details>


## Tools

<details false>

<summary>Packages</summary>

<h3><a href="packages/tools/eslint">@reapit-cdk/eslint-config</a></h3>

![npm version](https://img.shields.io/npm/v/@reapit-cdk/eslint-config)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/eslint-config)
![coverage: 0%25](https://img.shields.io/badge/coverage-0%25-red)

@reapit-cdk eslint config.
<h3><a href="packages/tools/generate-readme">@reapit-cdk/generate-readme</a></h3>

![npm version](https://img.shields.io/npm/v/@reapit-cdk/generate-readme)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/generate-readme)
![coverage: 0%25](https://img.shields.io/badge/coverage-0%25-red)

Generates package readmes.
<h3><a href="packages/tools/integration-tests">@reapit-cdk/integration-tests</a></h3>

![npm version](https://img.shields.io/npm/v/@reapit-cdk/integration-tests)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/integration-tests)
![coverage: 0%25](https://img.shields.io/badge/coverage-0%25-red)

Easily run integration tests for CDK constructs using Jest. On successful test suite run, snapshots the stack which gets stored in your repo alongside the test. Subsequent test runs will diff the stack against the snapshot, and only run the tests if something changes.
<h3><a href="packages/tools/jsii">@reapit-cdk/jsii</a></h3>

![npm version](https://img.shields.io/npm/v/@reapit-cdk/jsii)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/jsii)
![coverage: 0%25](https://img.shields.io/badge/coverage-0%25-red)

JSII tools for @reapit-cdk.
<h3><a href="packages/tools/tsconfig">@reapit-cdk/tsconfig</a></h3>

![npm version](https://img.shields.io/npm/v/@reapit-cdk/tsconfig)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/tsconfig)
![coverage: 0%25](https://img.shields.io/badge/coverage-0%25-red)

tsconfig for @reapit-cdk.
<h3><a href="packages/tools/tsup">@reapit-cdk/tsup</a></h3>

![npm version](https://img.shields.io/npm/v/@reapit-cdk/tsup)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/tsup)
![coverage: 0%25](https://img.shields.io/badge/coverage-0%25-red)

Easily build @reapit-cdk constructs and custom resource lambdas.

</details>

