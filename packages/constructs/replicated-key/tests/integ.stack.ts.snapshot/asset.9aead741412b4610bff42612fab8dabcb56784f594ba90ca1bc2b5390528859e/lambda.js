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

// ../../modules/common/src/regions.ts
var awsRegions = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "us-gov-west-1",
  "us-gov-east-1",
  "ca-central-1",
  "eu-north-1",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-central-1",
  "eu-south-1",
  "af-south-1",
  "ap-northeast-1",
  "ap-northeast-2",
  "ap-northeast-3",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-southeast-3",
  "ap-east-1",
  "ap-south-1",
  "ap-south-2",
  "sa-east-1",
  "me-south-1",
  "cn-north-1",
  "cn-northwest-1"
];
var stringIsAWSRegion = (str) => awsRegions.includes(str);

// src/lambda/ensure-replication.ts
var import_client_kms2 = require("@aws-sdk/client-kms");

// src/lambda/key.ts
var import_client_kms = require("@aws-sdk/client-kms");

// src/generate-key-policy.ts
var generateKeyPolicy = (account, region) => {
  return {
    Id: "auto-secretsmanager-2",
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "Allow access through AWS Secrets Manager for all principals in the account that are authorized to use AWS Secrets Manager",
        Effect: "Allow",
        Principal: {
          AWS: ["*"]
        },
        Action: ["kms:Encrypt", "kms:Decrypt", "kms:ReEncrypt*", "kms:CreateGrant", "kms:DescribeKey"],
        Resource: "*",
        Condition: {
          StringEquals: {
            "kms:CallerAccount": account,
            "kms:ViaService": `secretsmanager.${region}.amazonaws.com`
          }
        }
      },
      {
        Sid: "Allow access through AWS Secrets Manager for all principals in the account that are authorized to use AWS Secrets Manager",
        Effect: "Allow",
        Principal: {
          AWS: ["*"]
        },
        Action: "kms:GenerateDataKey*",
        Resource: "*",
        Condition: {
          StringEquals: {
            "kms:CallerAccount": account
          },
          StringLike: {
            "kms:ViaService": `secretsmanager.${region}.amazonaws.com`
          }
        }
      },
      {
        Sid: "Allow direct access to key to the account",
        Effect: "Allow",
        Principal: {
          AWS: [`arn:aws:iam::${account}:root`]
        },
        Action: ["kms:*"],
        Resource: "*"
      }
    ]
  };
};

// src/lambda/utils.ts
var parseArn = (keyArn) => {
  const region = keyArn.split(":")[3];
  const account = keyArn.split(":")[4];
  const keyId = keyArn.split("key/")[1];
  return {
    region,
    account,
    keyId
  };
};
var strIsDefined = (str) => !!str;

// src/lambda/key.ts
var unDeleteKeyIfExists = async (keyId, region) => {
  console.log(region, keyId, "checking if exists");
  const client = new import_client_kms.KMSClient({ region });
  try {
    const res = await client.send(
      new import_client_kms.DescribeKeyCommand({
        KeyId: keyId
      })
    );
    console.log(region, keyId, "key already exists");
    if (res.KeyMetadata?.KeyState === import_client_kms.KeyState.PendingDeletion) {
      console.log(region, keyId, "cancelling key deletion");
      await client.send(
        new import_client_kms.CancelKeyDeletionCommand({
          KeyId: keyId
        })
      );
      console.log(region, keyId, "deletion cancellation request");
      await waitForReplicaKeyEnabled(keyId, region);
    }
    return true;
  } catch (e) {
    console.log(region, keyId, "key does not exist", e);
    return false;
  }
};
var wait = (ms) => {
  if (process.env.TEST) {
    return;
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
};
var waitForReplicaKeyEnabled = async (keyId, replicaRegion, iteration = 0) => {
  if (iteration > 100) {
    throw new Error(`Replica key ${keyId} in ${replicaRegion} did not become enabled in time.`);
  }
  const client = new import_client_kms.KMSClient({ region: replicaRegion });
  const { KeyMetadata: KeyMetadata2 } = await client.send(
    new import_client_kms.DescribeKeyCommand({
      KeyId: keyId
    })
  );
  if (!KeyMetadata2) {
    throw new Error("no KeyMetadata returned from DescribeKey");
  }
  console.log(keyId, replicaRegion, "is", KeyMetadata2.KeyState);
  switch (KeyMetadata2.KeyState) {
    case import_client_kms.KeyState.Enabled:
      return true;
    case import_client_kms.KeyState.Creating:
    case import_client_kms.KeyState.PendingImport:
    case import_client_kms.KeyState.Updating:
      await wait(5e3);
      return await waitForReplicaKeyEnabled(keyId, replicaRegion, iteration + 1);
    default:
      throw new Error(`Replica key ${keyId} in ${replicaRegion} in unhandled state: ${KeyMetadata2.KeyState}`);
  }
};
var replicateKey = async (keyArn, replicaRegion) => {
  const { region, keyId, account } = parseArn(keyArn);
  const exists = await unDeleteKeyIfExists(keyId, replicaRegion);
  if (exists) {
    return;
  }
  console.log(replicaRegion, keyId, "replicating key");
  const client = new import_client_kms.KMSClient({ region });
  const { ReplicaKeyMetadata } = await client.send(
    new import_client_kms.ReplicateKeyCommand({
      KeyId: keyId,
      ReplicaRegion: replicaRegion,
      Policy: JSON.stringify(generateKeyPolicy(account, replicaRegion))
    })
  );
  console.log(replicaRegion, keyId, "replication requested", ReplicaKeyMetadata);
  await waitForReplicaKeyEnabled(keyId, replicaRegion);
  return ReplicaKeyMetadata;
};
var deleteKey = async (keyId, region) => {
  console.log(region, keyId, "deleting key");
  const client = new import_client_kms.KMSClient({ region });
  await client.send(
    new import_client_kms.ScheduleKeyDeletionCommand({
      KeyId: keyId
    })
  );
  console.log(region, keyId, "deleted");
};

// src/lambda/ensure-replication.ts
var validateKeyMetadata = (keyMetadata) => {
  if (!keyMetadata) {
    throw new Error("key metadata undefined");
  }
  const { MultiRegion, MultiRegionConfiguration } = keyMetadata;
  if (!MultiRegion) {
    throw new Error("given key is not multiregion");
  }
  if (MultiRegionConfiguration) {
    const { MultiRegionKeyType, ReplicaKeys } = MultiRegionConfiguration;
    if (MultiRegionKeyType !== import_client_kms2.MultiRegionKeyType.PRIMARY) {
      throw new Error("given key is not multiregion primary key");
    }
    if (ReplicaKeys) {
      const existingRegions = ReplicaKeys.map((key) => key.Region).filter(strIsDefined).filter(stringIsAWSRegion);
      return existingRegions;
    }
  }
  throw new Error("given key is multiregion but no multiregion configuration was found");
};
var ensureReplication = async (keyArn, regions) => {
  const { region, keyId } = parseArn(keyArn);
  const client = new import_client_kms2.KMSClient({
    region
  });
  console.log(region, keyId, "ensuring replication");
  const res = await client.send(
    new import_client_kms2.DescribeKeyCommand({
      KeyId: keyId
    })
  );
  const existingRegions = validateKeyMetadata(res.KeyMetadata);
  console.log(region, keyId, "exists in regions", existingRegions);
  const regionsToDelete = existingRegions.filter((region2) => !regions.includes(region2));
  const regionsToReplicate = regions.filter((region2) => !regionsToDelete.includes(region2));
  console.log(region, keyId, "deleting in regions", regionsToDelete);
  console.log(region, keyId, "ensuring replication in regions", regionsToReplicate);
  await Promise.all(regionsToDelete.map((region2) => deleteKey(keyId, region2)));
  await Promise.all(regionsToReplicate.map((region2) => replicateKey(keyArn, region2)));
};
var deleteReplicas = async (keyArn, regions) => {
  const { region, keyId } = parseArn(keyArn);
  const client = new import_client_kms2.KMSClient({
    region
  });
  console.log(region, keyId, "deleting replicas");
  const res = await client.send(
    new import_client_kms2.DescribeKeyCommand({
      KeyId: keyId
    })
  );
  const existingRegions = validateKeyMetadata(res.KeyMetadata);
  const regionsToDelete = existingRegions.filter((region2) => regions.includes(region2));
  console.log(region, keyId, "deleting in regions", regionsToDelete);
  const notDeletingRegions = existingRegions.filter((region2) => !regions.includes(region2));
  if (notDeletingRegions.length) {
    console.log(region, keyId, "not deleting in regions not we originally didnt replicate to", notDeletingRegions);
  }
  await Promise.all(regionsToDelete.map((region2) => deleteKey(keyId, region2)));
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
  onCreate: ({ keyArn, regions }) => ensureReplication(keyArn, regions),
  onUpdate: ({ keyArn, regions }) => ensureReplication(keyArn, regions),
  onDelete: ({ keyArn, regions }) => deleteReplicas(keyArn, regions)
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  onEvent
});
