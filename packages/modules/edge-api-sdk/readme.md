# @reapit-cdk/edge-api-sdk


![npm version](https://img.shields.io/npm/v/@reapit-cdk/edge-api-sdk)
![npm downloads](https://img.shields.io/npm/dm/@reapit-cdk/edge-api-sdk)
![coverage: 95.8%25](https://img.shields.io/badge/coverage-95.8%25-green)

Provides convenience wrappers for accepting and responding to [@reapit-cdk/edge-api]('../../constructs/edge-api/readme.md') lambda requests.

## Package Installation:

```sh
yarn add --dev @reapit-cdk/edge-api-sdk
# or
npm install @reapit-cdk/edge-api-sdk --save-dev
```


## CORS
`OPTIONS` requests are automatically responded to.

Specify a `corsOrigin` in the request environment you wish to allow and it will automatically add the required headers.

## Usage
You choose a wrapper function and pass it a single argument: your function.

The library exposes three functions, you choose one depending on the kind of request you're accepting:

* `jsonRequestHandler` - Handle JSON requests
* `formRequestHandler` - Handle url-encoded form requests
* `requestHandler` - Raw request handler, for anything else

The functions accept two type arguments: `EnvType` and `BodyType`.
`EnvType` defined what will be accessible in `request.env`, and `BodyType` optionally on `request.body`.

You can also explicitly specify a response type for your function so that it can be included in the swagger docs.
Response types available are:
* `JSONResponse<T>` where `T` is the being returned.
* `RedirectionResponse` for `302`s.

Your function will be called with a single argument: the request. The request object includes:

| Property | Type | Description |
| ---- | ---- | ---- |
| path | `string` | e.g. `'/api/resource'` |
| method | `HTTPMethod` (string) | e.g. `'GET'` |
| body | `undefined` or `string` or `BodyType` (type argument) |  |
| headers | `Record<string, string | string[]>` | e.g. `{ host: 'google.com', something: ['a', 'b'] }` |
| host | `string` | The requested host e.g. `'google.com'` |
| cookies | string[] | Unparsed cookies e.g. `['a=b', 'c=d']` |
| query | undefined or `Record<string, string | string[]>` | Parsed querystring, if present on the request. e.g. `{ id: '123', something: ['a', 'b'] }` |
| env | `EnvType` (type argument) | The environment, or config, passed into the request by the cdk stack. Useful for passing resource arns etc. |
| region | `AWSRegion` (string) | The region the lambda is currently executing in. e.g. `'us-east-1'` |

Example of a simple function that accepts a JSON request and returns a JSON response:
```ts
import { jsonRequestHandler, JSONResponse } from '@reapit-cdk/edge-api-sdk'

type EnvType = {
  awsResourceArn: string
}
type BodyType = {
  something: string
}
type ResponseBodyType = {
  success: boolean
}

export const handler = jsonRequestHandler<EnvType, BodyType>(
  async (request): Promise<JSONResponse<ResponseBodyType>> => {
    const {
      env: { awsResourceArn },
      body,
    } = request

    if (body) {
      const { something } = body
      console.log('heres something', something, awsResourceArn)

      return {
        body: {
          success: true,
        },
      }
    }

    return {
      body: {
        success: false,
      },
    }
  },
)
```

## Testing your function

If we were to `import { handler }` from the above file, `handler` would be a function that accepted CloudFront/API Gateway events and returned appropriate responses. We could test this function but it would involve a lot of marshalling code to create inputs and parse the outputs.

In order to fix this, the nested function (the one you wrote) is exposed via `handler.handler`, so you can write test code which looks like this:
```ts
import { handler } from './lambda'

describe('example', () => {
  beforeAll(() => {
    process.env.AWS_REGION = 'eu-west-2'
  })

  it('returns success true if a body is supplied', async () => {
    const result = await handler.handler({
      headers: {},
      cookies: [],
      host: 'google.com',
      region: 'eu-west-2',
      path: '/',
      method: 'POST',
      body: { something: 'example' },
      env: {
        awsResourceArn: 'aws-resource-arn',
      },
    })
    expect(result.body.success).toBe(true)
  })

  it('returns success false if a body is not supplied', async () => {
    const result = await handler.handler({
      headers: {},
      cookies: [],
      host: 'google.com',
      region: 'eu-west-2',
      path: '/',
      method: 'GET',
      env: {
        awsResourceArn: 'aws-resource-arn',
      },
    })
    expect(result.body.success).toBe(false)
  })
})

```