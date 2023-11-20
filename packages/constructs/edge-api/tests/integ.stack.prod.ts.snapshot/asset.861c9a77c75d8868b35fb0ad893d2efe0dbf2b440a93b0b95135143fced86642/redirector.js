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

// src/lambdas/redirector.ts
var redirector_exports = {};
__export(redirector_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(redirector_exports);
var getEnv = (headers) => {
  const envHeader = headers.env;
  const env = envHeader ? JSON.parse(Buffer.from(envHeader, "base64").toString("utf-8")) : {};
  return env;
};
var handler = async (event) => {
  const { headers, rawQueryString, rawPath } = event;
  const { destination } = getEnv(headers);
  const location = `${destination}${rawPath}${rawQueryString ? "?" + rawQueryString : ""}`;
  return {
    statusCode: 302,
    headers: {
      location
    }
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
