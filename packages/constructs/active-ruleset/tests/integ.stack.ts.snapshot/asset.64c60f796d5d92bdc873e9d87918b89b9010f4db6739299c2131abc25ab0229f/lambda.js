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

// src/lambda/ensure-active-ruleset.ts
var import_client_ses = require("@aws-sdk/client-ses");
var client = new import_client_ses.SESClient({});
var ensureRuleSet = async (name) => {
  try {
    await client.send(
      new import_client_ses.DescribeReceiptRuleSetCommand({
        RuleSetName: name
      })
    );
    console.log("found existing ruleset", name);
    return name;
  } catch (e) {
    if (e instanceof import_client_ses.RuleSetDoesNotExistException) {
      console.log("not found ruleset, creating", name);
      await client.send(
        new import_client_ses.CreateReceiptRuleSetCommand({
          RuleSetName: name
        })
      );
      console.log("created ruleset", name);
      return name;
    }
    throw e;
  }
};
var getActiveRuleSet = async () => {
  const activeRuleSet = await client.send(new import_client_ses.DescribeActiveReceiptRuleSetCommand({}));
  console.log("found existing ruleset", activeRuleSet.Metadata?.Name);
  return activeRuleSet.Metadata?.Name;
};
var defaultName = "rpt-cdk-active-ruleset";
var activateRuleSet = async (name) => {
  console.log("activating ruleset", name);
  await client.send(
    new import_client_ses.SetActiveReceiptRuleSetCommand({
      RuleSetName: name
    })
  );
  console.log("activated", name);
  return name;
};
var ensureActiveRuleSet = async () => {
  const existing = await getActiveRuleSet();
  if (existing) {
    return existing;
  }
  await ensureRuleSet(defaultName);
  await activateRuleSet(defaultName);
  return defaultName;
};
var deleteIfEmpty = async () => {
  const activeRuleSet = await client.send(new import_client_ses.DescribeActiveReceiptRuleSetCommand({}));
  const activeName = activeRuleSet.Metadata?.Name;
  console.log("found active ruleset", activeName);
  if (activeName !== defaultName) {
    console.log("active ruleset is not one we created, skipping deletion");
    return;
  }
  if (activeRuleSet.Rules?.length) {
    console.log("active ruleset contains rules, skipping deletion");
    return;
  }
  console.log(`deactivating ruleset "${activeName}"`);
  await client.send(
    new import_client_ses.SetActiveReceiptRuleSetCommand({
      RuleSetName: void 0
    })
  );
  console.log(`deleting ruleset "${activeName}"`);
  await client.send(
    new import_client_ses.DeleteReceiptRuleSetCommand({
      RuleSetName: activeName
    })
  );
  console.log(`deleted ruleset "${activeName}"`);
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
var customResourceWrapper = (handler2) => {
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
          const data = await handler2.onCreate(augmentedRP);
          return successEvent(event, { data });
        }
        case "Delete": {
          if (handler2.onDelete) {
            await handler2.onDelete(augmentedRP);
          }
          return successEvent(event, {});
        }
        case "Update": {
          if (handler2.onUpdate) {
            const data = await handler2.onUpdate(augmentedRP, event.OldResourceProperties);
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
var handler = async () => {
  const ruleSetName = await ensureActiveRuleSet();
  return {
    ruleSetName
  };
};
var onEvent = customResourceWrapper({
  onCreate: handler,
  onUpdate: handler,
  onDelete: deleteIfEmpty
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  onEvent
});
