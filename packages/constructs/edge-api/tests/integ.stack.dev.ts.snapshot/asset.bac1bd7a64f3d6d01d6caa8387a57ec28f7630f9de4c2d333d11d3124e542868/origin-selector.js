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

// src/lambdas/origin-selector.ts
var origin_selector_exports = {};
__export(origin_selector_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(origin_selector_exports);
var getEnv = (event2) => {
  const header = event2.origin?.custom?.customHeaders["env"];
  const str = header ? header[0].value : void 0;
  return str ? JSON.parse(str) : {};
};
var middlewares = [];
var handler = async (event) => {
  console.log(JSON.stringify(event));
  const [Record] = event.Records;
  if (!Record) {
    throw new Error("no Record present");
  }
  const req = Record.cf.request;
  const reqHostHeaders = req.headers["req-host"];
  if (!reqHostHeaders?.length) {
    throw new Error("no req-host header present");
  }
  const host = reqHostHeaders[0].value;
  if (!host) {
    throw new Error("no req-host header present");
  }
  if (!req.origin) {
    throw new Error("no origin present on request");
  }
  if (!req.origin.custom) {
    throw new Error("no custom origin present on request");
  }
  const { domainMapping } = getEnv(req);
  const mapping = domainMapping[host];
  if (!mapping) {
    throw new Error(`no domain mapping found for host ${host}`);
  }
  req.origin = {
    custom: {
      ...req.origin.custom,
      domainName: mapping.domain
    }
  };
  req.headers["host"] = [
    {
      key: "host",
      value: mapping.domain
    }
  ];
  middlewares.forEach((middleware) => {
    try {
      eval(middleware)(req, mapping);
    } catch (e) {
      console.error(e);
    }
  });
  return req;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
