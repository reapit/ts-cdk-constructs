# @reapit-cdk/edge-api
This construct creates a truly globally available API where code executes at the edge.

Because changes take a long time to propagate to all edge locations, there is a `devMode` flag which will instead deploy your API to a [HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html). This is compatible with hotswapping, so [`cdk watch`](https://docs.aws.amazon.com/cdk/v2/guide/cli.html#cli-deploy-watch) works very well.

In order to make it easy to develop APIs which handle both event formats and work around the environment variable limitation, I recommend you use the lightweight request wrapper [@reapit-cdk/edge-api-sdk](../../libs/edge-api-sdk) which normalises the event format and offers some extra helpers.

## npm Package Installation:
```sh
yarn add --dev @reapit-cdk/edge-api
# or
npm install @reapit-cdk/edge-api --save-dev
```


## Example Usage
```ts

```