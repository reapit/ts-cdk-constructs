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

// src/lambdas/rewriter.ts
var rewriter_exports = {};
__export(rewriter_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(rewriter_exports);
var rewriteCookie = (header, host) => {
  return header.split("; ").map((part) => {
    if (part.startsWith("Domain=")) {
      return `Domain=${host}`;
    }
    return part;
  }).join("; ");
};
var domains = ["example.org"];
var doCookieRewrite = true;
var doRedirectRewrite = true;
var rewriteLocationHeader = (location, host) => {
  try {
    const url = new URL(location);
    if (url.hostname !== host && domains.find((domain) => url.hostname.endsWith(domain))) {
      url.hostname = host;
    }
    return url.toString();
  } catch (e) {
    console.error(e);
  }
  return location;
};
var handler = async (event) => {
  const req = event.Records[0].cf.request;
  const res = event.Records[0].cf.response;
  const host = req.headers["host"][0].value;
  if (doCookieRewrite && res.headers["set-cookie"]) {
    res.headers["set-cookie"] = res.headers["set-cookie"].map(({ key, value }) => ({
      key,
      value: rewriteCookie(value, host)
    }));
  }
  if (doRedirectRewrite && res.headers["location"]) {
    res.headers["location"][0].value = rewriteLocationHeader(res.headers["location"][0].value, host);
  }
  return res;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
