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

// src/lambda/wait-for-replication.ts
var import_client_secrets_manager = require("@aws-sdk/client-secrets-manager");
var client = new import_client_secrets_manager.SecretsManagerClient({});
var wait = (ms) => {
  if (!process.env.TEST) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  return;
};
var waitForReplication = async (secretId, regions, iteration = 0) => {
  const res = await client.send(
    new import_client_secrets_manager.DescribeSecretCommand({
      SecretId: secretId
    })
  );
  if (!res.ReplicationStatus) {
    throw new Error("Waiting for replication regions but replicationstatus was undefined");
  }
  const weCareAbout = res.ReplicationStatus.filter(({ Region }) => Region && regions.includes(Region));
  const statusStr = weCareAbout.map(({ Region, Status, StatusMessage }) => `${Region}: ${Status} ${StatusMessage ?? ""}`.trim()).join(", ");
  console.log(`Replication status ${statusStr}`);
  const failed = weCareAbout.filter(({ Status }) => Status === import_client_secrets_manager.StatusType.Failed);
  if (failed.length) {
    throw new Error(`Replication failed: ${statusStr}`);
  }
  const waitingFor = weCareAbout.filter(({ Status }) => Status === import_client_secrets_manager.StatusType.InProgress);
  if (waitingFor.length) {
    if (iteration === 30) {
      throw new Error("Regions failed to propagate in time");
    }
    await wait(1e3 * 10);
    return waitForReplication(secretId, regions, iteration + 1);
  }
};

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

// src/lambda/lambda.ts
var onEvent = customResourceWrapper({
  onCreate: ({ secretArn, regions }) => waitForReplication(secretArn, regions),
  onUpdate: ({ secretArn, regions }) => waitForReplication(secretArn, regions)
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  onEvent
});
