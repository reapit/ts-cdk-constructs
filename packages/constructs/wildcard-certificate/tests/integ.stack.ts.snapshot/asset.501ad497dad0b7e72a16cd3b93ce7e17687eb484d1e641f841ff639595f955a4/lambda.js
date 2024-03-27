"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/lambda/lambda.ts
var lambda_exports = {};
__export(lambda_exports, {
  onEvent: () => onEvent
});
module.exports = __toCommonJS(lambda_exports);

// src/lambda/ensure-wildcard-certificate.ts
var import_client_acm = require("@aws-sdk/client-acm");
var crypto = __toESM(require("crypto"));

// src/lambda/ensure-dns-records.ts
var import_client_route_53 = require("@aws-sdk/client-route-53");

// src/lambda/assume-role.ts
var import_crypto = require("crypto");
var import_client_sts = require("@aws-sdk/client-sts");
var assumeRole = async ({ roleArn }) => {
  const client2 = new import_client_sts.STSClient({});
  const res = await client2.send(
    new import_client_sts.AssumeRoleCommand({
      RoleArn: roleArn,
      RoleSessionName: (0, import_crypto.randomUUID)()
    })
  );
  if (!res.Credentials) {
    throw new Error(`failed to assumed role ${roleArn}`);
  }
  const { AccessKeyId, Expiration, SecretAccessKey, SessionToken } = res.Credentials;
  if (!AccessKeyId || !SecretAccessKey) {
    throw new Error("invalid credentials returned from assumerole call");
  }
  return {
    accessKeyId: AccessKeyId,
    secretAccessKey: SecretAccessKey,
    expiration: Expiration,
    sessionToken: SessionToken
  };
};

// src/lambda/ensure-dns-records.ts
var ensureDnsRecords = async (hostedZones, records) => {
  await Promise.all(
    records.map(async ({ Name, Type, Value }) => {
      const zone = Name && hostedZones.find(
        ({ parentDomainName }) => Name.endsWith(parentDomainName) || Name.endsWith(parentDomainName + ".")
      );
      if (!zone) {
        throw new Error(`Could not find hosted zone for subdomain ${Name} in ${JSON.stringify(hostedZones)}`);
      }
      const { hostedZoneId: HostedZoneId, roleArn } = zone;
      console.log("using zone", HostedZoneId, "for subdomain", Name);
      if (roleArn) {
        console.log("assuming role", roleArn);
      }
      const client2 = new import_client_route_53.Route53Client({
        credentials: roleArn ? await assumeRole({ roleArn }) : void 0
      });
      const Changes = [
        {
          Action: "UPSERT",
          ResourceRecordSet: {
            Name,
            Type,
            TTL: 60,
            ResourceRecords: [
              {
                Value
              }
            ]
          }
        }
      ];
      console.log("requesting changes", JSON.stringify(Changes));
      const changeBatch = await client2.send(
        new import_client_route_53.ChangeResourceRecordSetsCommand({
          ChangeBatch: {
            Changes
          },
          HostedZoneId
        })
      );
      if (!changeBatch.ChangeInfo?.Id) {
        throw new Error("Route53 no change batch id to wait for");
      }
      console.log("requested, waiting for propagation");
      await (0, import_client_route_53.waitUntilResourceRecordSetsChanged)(
        { maxWaitTime: 180, client: client2 },
        {
          Id: changeBatch.ChangeInfo?.Id
        }
      );
    })
  );
};

// src/lambda/ensure-wildcard-certificate.ts
var client = new import_client_acm.ACMClient({});
var ISSUED = "ISSUED";
var PENDING_VALIDATION = "PENDING_VALIDATION";
var certIncludesDomainNames = (cert, domainNames) => {
  if (!cert.SubjectAlternativeNameSummaries) {
    return false;
  }
  return domainNames.filter((domainName) => {
    return cert.SubjectAlternativeNameSummaries?.includes(domainName);
  }).length === domainNames.length;
};
var findCertificates = async (domainNames, NextToken) => {
  const certificates = await client.send(
    new import_client_acm.ListCertificatesCommand({
      CertificateStatuses: [ISSUED, PENDING_VALIDATION],
      NextToken
    })
  );
  const existing = certificates.CertificateSummaryList?.filter((cert) => certIncludesDomainNames(cert, domainNames)) ?? [];
  if (certificates.NextToken) {
    const next = await findCertificates(domainNames, certificates.NextToken);
    return [...existing, ...next];
  }
  return existing;
};
var waitForCert = async (arn) => {
  const result = await (0, import_client_acm.waitUntilCertificateValidated)(
    {
      client,
      maxWaitTime: 5 * 60
      // 5 minutes
    },
    {
      CertificateArn: arn
    }
  );
  if (result.state !== "SUCCESS") {
    throw new Error(
      `Wait for cert validation returned "${result.state}"${result.reason ? " with no reason given." : ` with reason: "${result.reason}"`}`
    );
  }
  return arn;
};
function isDefined(val) {
  return val !== void 0 && val !== null;
}
var getDomainValidationRecords = async (arn, attempt = 0) => {
  console.log("getting domain validation record for arn", arn);
  const cert = await client.send(
    new import_client_acm.DescribeCertificateCommand({
      CertificateArn: arn
    })
  );
  console.log("got", JSON.stringify(cert.Certificate));
  if (cert.Certificate?.DomainValidationOptions) {
    const resourceRecords = cert.Certificate.DomainValidationOptions.map(({ ResourceRecord: ResourceRecord2 }) => ResourceRecord2).filter(
      isDefined
    );
    const uniqueResourceRecords = resourceRecords.reduce(
      (acc, cur) => {
        if (cur.Name) {
          acc[cur.Name] = cur;
        }
        return acc;
      },
      {}
    );
    const rr = Object.keys(uniqueResourceRecords).sort((a, b) => a.localeCompare(b)).map((key) => uniqueResourceRecords[key]);
    if (rr.length) {
      return rr;
    }
  }
  if (attempt >= 10) {
    throw new Error("exceeded max attempts");
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
  return getDomainValidationRecords(arn, attempt + 1);
};
var ensureWildcardCertificate = async (requestId, domainMappings) => {
  const wildcardDomainNames = domainMappings.map(({ parentDomainName, includeParent }) => {
    return includeParent ? [parentDomainName, `*.${parentDomainName}`] : [`*.${parentDomainName}`];
  }).flat();
  console.log("ensureWildcardCert", wildcardDomainNames);
  const existing = await findCertificates(wildcardDomainNames);
  console.log("got existing", JSON.stringify(existing));
  const existingValid = existing.find((cert) => cert.Status === ISSUED);
  if (existingValid?.CertificateArn) {
    console.log("found issued valid existing", existingValid.CertificateArn);
    return existingValid.CertificateArn;
  }
  const existingPending = existing.find((cert) => cert.Status === PENDING_VALIDATION);
  if (existingPending?.CertificateArn) {
    console.log("found pending valid existing", existingPending.CertificateArn);
    const resourceRecords = await getDomainValidationRecords(existingPending.CertificateArn);
    console.log("got required dns records", JSON.stringify(resourceRecords));
    await ensureDnsRecords(domainMappings, resourceRecords);
    console.log("added records, waiting for validation");
    return waitForCert(existingPending.CertificateArn);
  }
  console.log("requesting new cert");
  const newCert = await client.send(
    new import_client_acm.RequestCertificateCommand({
      DomainName: wildcardDomainNames[0],
      SubjectAlternativeNames: wildcardDomainNames,
      ValidationMethod: "DNS",
      IdempotencyToken: crypto.createHash("sha256").update(requestId).digest("hex").substring(0, 32)
    })
  );
  if (newCert.CertificateArn) {
    console.log("requested new cert", newCert.CertificateArn);
    const resourceRecords = await getDomainValidationRecords(newCert.CertificateArn);
    console.log("got required dns records", JSON.stringify(resourceRecords));
    await ensureDnsRecords(domainMappings, resourceRecords);
    console.log("added records, waiting for validation");
    return waitForCert(newCert.CertificateArn);
  }
  console.log(
    JSON.stringify({
      existingValid,
      existingPending,
      newCert
    })
  );
  throw new Error("Something went wrong");
};
var deleteIfUnused = async (certificateArn) => {
  const cert = await client.send(
    new import_client_acm.DescribeCertificateCommand({
      CertificateArn: certificateArn
    })
  );
  if (cert.Certificate?.InUseBy?.length) {
    console.log("skipping delection: cert stil in use");
    return;
  }
  await client.send(
    new import_client_acm.DeleteCertificateCommand({
      CertificateArn: certificateArn
    })
  );
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
            await handler2.onDelete({
              ...augmentedRP,
              physicalResourceId: event.PhysicalResourceId
            });
          }
          return successEvent(event, {});
        }
        case "Update": {
          if (handler2.onUpdate) {
            const data = await handler2.onUpdate(
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
var arrayHasChanged = (arr, newArr) => {
  if (arr.length !== newArr.length) {
    return true;
  }
  return JSON.stringify(arr) !== JSON.stringify(newArr);
};
var objectHasChanged = (oldObject, newObject) => {
  const { ServiceToken, requestId, ...newObj } = newObject;
  return arrayHasChanged(Object.keys(oldObject), Object.keys(newObj)) || Object.keys(oldObject).some((key) => arrayHasChanged(oldObject[key], newObj[key]));
};
var handler = async ({ domainMappings, requestId }) => {
  const certificateArn = await ensureWildcardCertificate(requestId, domainMappings);
  return {
    certificateArn,
    physicalResourceId: certificateArn
  };
};
var onEvent = customResourceWrapper({
  onCreate: handler,
  onUpdate: (props, oldProps) => {
    if (objectHasChanged(oldProps, props)) {
      return handler(props);
    }
    return;
  },
  onDelete: async ({ physicalResourceId }) => {
    if (physicalResourceId) {
      await deleteIfUnused(physicalResourceId);
    }
    return;
  }
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  onEvent
});
