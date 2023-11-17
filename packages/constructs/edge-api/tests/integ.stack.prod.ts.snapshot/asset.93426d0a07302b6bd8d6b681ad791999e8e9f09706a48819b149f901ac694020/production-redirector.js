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

// src/lambdas/production-redirector.ts
var production_redirector_exports = {};
__export(production_redirector_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(production_redirector_exports);
var getEnv = (event) => {
  const header = event.origin?.s3?.customHeaders["env"];
  const str = header ? header[0].value : void 0;
  return str ? JSON.parse(str) : {};
};
var pickDestination = (destination, host) => {
  if (typeof destination === "string") {
    return destination;
  }
  const map = destination[host];
  if (!map) {
    throw new Error(`Unable to find destination from ${JSON.stringify(destination)} for host "${host}"`);
  }
  if (typeof map === "string") {
    return map;
  }
  if (typeof map.destination === "string") {
    return map.destination;
  }
  throw new Error(`Unable to find destination from ${JSON.stringify(destination)} for host "${host}"`);
};
var ensureHTTPS = (url) => {
  if (!url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
};
var handler = async (event) => {
  try {
    const [Record] = event.Records;
    if (!Record) {
      throw new Error("no Record present");
    }
    const req = Record.cf.request;
    const hostHeaders = req.headers["host"];
    if (!hostHeaders?.length) {
      throw new Error("no host header present");
    }
    const host = hostHeaders[0].value;
    if (!host) {
      throw new Error("no host header present");
    }
    const { destination } = getEnv(req);
    if (!destination) {
      throw new Error("no destination present on request");
    }
    const location = ensureHTTPS(pickDestination(destination, host));
    return {
      status: "302",
      statusDescription: "Found",
      headers: {
        location: [
          {
            key: "location",
            value: location
          }
        ]
      }
    };
  } catch (e) {
    console.log(JSON.stringify(event));
    console.error(e);
    return {
      status: "302",
      statusDescription: "Found",
      headers: {
        location: [
          {
            key: "location",
            value: `/error?${new URLSearchParams({
              error: e.name,
              message: e.message
            }).toString()}`
          }
        ]
      }
    };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
