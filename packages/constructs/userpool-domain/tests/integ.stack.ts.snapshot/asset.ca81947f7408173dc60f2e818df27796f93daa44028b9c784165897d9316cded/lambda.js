"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/lambda/lambda.ts
var lambda_exports = {};
__export(lambda_exports, {
  onEvent: () => onEvent
});
module.exports = __toCommonJS(lambda_exports);

// src/lambda/ensure-domain.ts
var import_client_cognito_identity_provider = require("@aws-sdk/client-cognito-identity-provider");
var import_crypto = require("crypto");
var getUserPoolDomain = async (userPoolId) => {
  const [region] = userPoolId.split("_");
  const client = new import_client_cognito_identity_provider.CognitoIdentityProviderClient({
    region
  });
  const userPool = await client.send(
    new import_client_cognito_identity_provider.DescribeUserPoolCommand({
      UserPoolId: userPoolId
    })
  );
  const { Domain, CustomDomain } = userPool.UserPool || {};
  if (!Domain || Domain === CustomDomain) {
    return void 0;
  }
  return Domain;
};
var createUserPoolDomain = async (userPoolId) => {
  const [region] = userPoolId.split("_");
  const client = new import_client_cognito_identity_provider.CognitoIdentityProviderClient({
    region
  });
  const id = (0, import_crypto.randomUUID)();
  await client.send(
    new import_client_cognito_identity_provider.CreateUserPoolDomainCommand({
      Domain: id,
      UserPoolId: userPoolId
    })
  );
  return getUserPoolDomain(userPoolId);
};
var ensureUserPoolDomain = async (userPoolId) => {
  const domain = await getUserPoolDomain(userPoolId);
  if (!domain) {
    return await createUserPoolDomain(userPoolId);
  }
  return domain;
};

// ../custom-resource-wrapper/src/custom-resource-wrapper.ts
var successEvent = (event, { data }) => {
  const { physicalResourceId, ...rest } = data || {};
  const restData = Object.keys(rest).length ? rest : void 0;
  return {
    ...event,
    Status: "SUCCESS",
    Data: restData,
    PhysicalResourceId: physicalResourceId || event.PhysicalResourceId || event.LogicalResourceId
  };
};
var failureEvent = (event, { reason }) => {
  return {
    ...event,
    Status: "FAILED",
    Reason: reason,
    PhysicalResourceId: event.PhysicalResourceId || event.LogicalResourceId
  };
};
var errToString = (e) => {
  return `[${e.name}] ${e.message}: ${e.stack}`;
};
var customResourceWrapper = (handler) => {
  return async (event) => {
    console.log(JSON.stringify(event));
    const { ServiceToken, ...rp } = event.ResourceProperties;
    const augmentedRP = {
      ...rp,
      requestId: event.RequestId,
      serviceToken: ServiceToken
    };
    try {
      switch (event.RequestType) {
        case "Create": {
          const data = await handler.onCreate(augmentedRP);
          return successEvent(event, { data });
        }
        case "Delete": {
          if (handler.onDelete) {
            await handler.onDelete(augmentedRP);
          }
          return successEvent(event, {});
        }
        case "Update": {
          if (handler.onUpdate) {
            const data = await handler.onUpdate(augmentedRP, event.OldResourceProperties);
            return successEvent(event, { data });
          }
          return successEvent(event, {});
        }
      }
    } catch (e) {
      console.error(e);
      return failureEvent(event, { reason: errToString(e) });
    }
  };
};

// src/lambda/lambda.ts
var onEvent = customResourceWrapper({
  onCreate: async ({ userPoolId }) => {
    const domain = await ensureUserPoolDomain(userPoolId);
    return {
      domain
    };
  }
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  onEvent
});
