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

// src/lambdas/s3-qs-redirect.ts
var s3_qs_redirect_exports = {};
__export(s3_qs_redirect_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(s3_qs_redirect_exports);
var handler = async (event) => {
  const req = event.Records[0].cf.request;
  const res = event.Records[0].cf.response;
  if (res.status.startsWith("3") && res.headers.location && res.headers.location[0] && req.querystring) {
    res.headers.location[0].value += "?" + req.querystring;
  }
  return res;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
