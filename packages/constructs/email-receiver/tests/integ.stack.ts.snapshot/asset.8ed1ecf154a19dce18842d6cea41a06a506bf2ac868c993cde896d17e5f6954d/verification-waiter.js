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

// src/lambdas/verification-waiter.ts
var verification_waiter_exports = {};
__export(verification_waiter_exports, {
  onEvent: () => onEvent
});
module.exports = __toCommonJS(verification_waiter_exports);

// ../../modules/custom-resource-wrapper/src/custom-resource-wrapper.ts
var successEvent = (event, { data }) => {
  const { physicalResourceId, ...rest } = data ?? {};
  const restData = Object.keys(rest).length ? rest : void 0;
  return {
    ...event,
    Status: "SUCCESS",
    Data: restData,
    PhysicalResourceId: physicalResourceId ?? event.PhysicalResourceId ?? event.LogicalResourceId
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
            await handler.onDelete({
              ...augmentedRP,
              physicalResourceId: event.PhysicalResourceId
            });
          }
          return successEvent(event, {});
        }
        case "Update": {
          if (handler.onUpdate) {
            const data = await handler.onUpdate(
              {
                ...augmentedRP,
                physicalResourceId: event.PhysicalResourceId
              },
              event.OldResourceProperties
            );
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

// src/lambdas/verification-waiter.ts
var import_client_sesv2 = require("@aws-sdk/client-sesv2");
var client = new import_client_sesv2.SESv2Client();
var max = 30;
var wait = async (ms) => {
  await new Promise((resolve) => {
    if (process.env.TEST) {
      return resolve();
    }
    setTimeout(resolve, ms);
  });
};
var waitForVerification = async (emailIdentityName, iter = 0) => {
  if (iter > max) {
    throw new Error("wait for verification timed out");
  }
  const identity = await client.send(
    new import_client_sesv2.GetEmailIdentityCommand({
      EmailIdentity: emailIdentityName
    })
  );
  switch (identity.VerificationStatus) {
    case "FAILED": {
      throw new Error("AWS reports verification failed");
    }
    case "SUCCESS": {
      if (!identity.VerifiedForSendingStatus) {
        await wait(5e3);
        return await waitForVerification(emailIdentityName, iter + 1);
      }
      return "SUCCESS";
    }
    case "TEMPORARY_FAILURE":
    case "NOT_STARTED":
    case "PENDING": {
      await wait(5e3);
      return await waitForVerification(emailIdentityName, iter + 1);
    }
    default: {
      throw new Error(`Invalid verification status received from AWS: "${identity.VerificationStatus}"`);
    }
  }
};
var onEvent = customResourceWrapper({
  onCreate: ({ emailIdentityName }) => waitForVerification(emailIdentityName),
  onUpdate: ({ emailIdentityName }) => waitForVerification(emailIdentityName)
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  onEvent
});
