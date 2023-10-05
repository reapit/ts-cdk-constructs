## How is this different to an [Edge-optimized API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-endpoint-types.html)?
With Edge-optimized API Gateways, requests are routed from the user to the nearest CloudFront Point of Presence (POP), then to the region that the API resides in, where the request is handled.

With this construct, requests are routed from the user to the nearest CloudFront Point of Presence (POP) where they are handled and returned to the user, thus reducing latency and increasing availability.

## Limitations

### Environment Variables
Your configured environment variables will not be available in `process.env`. Instead, they exist in the lambda event. In production they are available on 
```js 
JSON.parse(event.Records[0].cf.request.origin.s3.customHeaders.env[0].value)
```
and in development mode, in
```js
JSON.parse(Buffer.from(event.headers.env, 'base64').toString('utf-8'))
```

### Method Handling
Due to [Cloudfront's AllowedMethods](https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_AllowedMethods.html) there are a few limitations:
* Specifying multiple handlers for the same path is not currently possible.
* Outside of specifying a `GET` & `HEAD`, or  `GET` & `HEAD` & `OPTIONS`, you cannot limit which methods your handler will get called for. This means that if you have a `POST` handler, it'll get called for `GET`, `HEAD`, `OPTIONS`, `PUT`, `PATCH`, `POST`, and `DELETE`.

### Lambda@Edge Restrictions
[Lambda@Edge restrictions](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-functions-restrictions.html#lambda-at-edge-function-restrictions) will apply to your lambdas. Your lambdas will be executed at `origin request` with `includeBody` set to true.
The most important ones to note are:
* VPCs are not supported
* Execution duration must not exceed 30 seconds
* Request body will be truncated on input and output to 1MB
* Only NodeJS and Python is supported
* Lambda containers are not supported
* Lambda layers are not supported
* ARM is not supported