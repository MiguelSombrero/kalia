#!/usr/bin/env node
// Fails a generated native project that carries a cleartext exception outside
// the two allowed ones (ADR-0097):
//   Android: `localhost`, under KALIA_E2E=1, in a network security config.
//   iOS: the tailnet host named by KALIA_PHONE_HOST, in phone mode.
// Anything app-wide, or for any other host, is a finding. Every build target
// runs it after `expo prebuild` and before the native build:
//   node mobile/scripts/check-cleartext.mjs ios|android
// reading KALIA_E2E and KALIA_PHONE_HOST from the environment the prebuild had.
// Only the app's main source set is read: Expo's `debug` overlay permits
// cleartext for Metro and belongs to the debug variant, which a release build
// does not merge.

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const { XML } = createRequire(import.meta.url)("expo/config-plugins");

const MOBILE = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" };
const decode = (text) => text.replace(/&(amp|lt|gt|quot|apos);/g, (entity) => ENTITIES[entity]);

// Only what an Info.plist holds: nested dictionaries, arrays, strings, booleans and numbers.
export const parsePlist = (xml) => {
  const tokens = [...xml.matchAll(/<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!DOCTYPE[^>]*>|<(\/?)([A-Za-z]+)\s*(\/?)>|([^<]+)/g)]
    .filter(([, , name, , text]) => name || (text !== undefined && text.trim() !== ""))
    .map(([, closing, name, selfClosing, text]) => (name ? { name, closing: closing === "/", selfClosing: selfClosing === "/" } : { text }));
  let at = 0;
  const textUntilClose = () => {
    let text = "";
    while (!tokens[at].closing) text += tokens[at++].text;
    at += 1;
    return decode(text);
  };
  const readValue = () => {
    const { name, selfClosing } = tokens[at++];
    if (name === "true" || name === "false") return name === "true";
    if (name === "dict") {
      const dict = {};
      while (!tokens[at].closing) {
        at += 1;
        const key = textUntilClose();
        dict[key] = readValue();
      }
      at += 1;
      return dict;
    }
    if (name === "array") {
      const list = [];
      while (!tokens[at].closing) list.push(readValue());
      at += 1;
      return list;
    }
    const text = selfClosing ? "" : textUntilClose();
    return name === "integer" || name === "real" ? Number(text) : text;
  };
  at = tokens.findIndex((token) => token.name === "dict");
  return readValue();
};

const truthy = (value) => value === true;

export const iosFindings = (plist, { phoneHost } = {}) => {
  const security = plist.NSAppTransportSecurity ?? {};
  const findings = [];
  for (const key of ["NSAllowsArbitraryLoads", "NSAllowsArbitraryLoadsInWebContent", "NSAllowsArbitraryLoadsForMedia"]) {
    if (truthy(security[key])) findings.push(`iOS: ${key} is true, which permits plain HTTP to every host`);
  }
  for (const [domain, exception] of Object.entries(security.NSExceptionDomains ?? {})) {
    const insecure = truthy(exception.NSExceptionAllowsInsecureHTTPLoads) || truthy(exception.NSTemporaryExceptionAllowsInsecureHTTPLoads);
    if (!insecure) continue;
    const subdomains = truthy(exception.NSIncludesSubdomains) || truthy(exception.NSTemporaryExceptionIncludesSubdomains);
    if (!phoneHost) findings.push(`iOS: plain HTTP is allowed for ${domain}, and phone mode is off`);
    else if (domain.toLowerCase() !== phoneHost.toLowerCase()) findings.push(`iOS: plain HTTP is allowed for ${domain}, which is not the tailnet host`);
    else if (subdomains) findings.push(`iOS: the exception for ${domain} includes its subdomains`);
  }
  return findings;
};

const attributes = (element) => element?.$ ?? {};

const walkDomainConfigs = (configs, e2e, findings) => {
  for (const config of configs ?? []) {
    const permitted = attributes(config).cleartextTrafficPermitted === "true";
    const domains = (config.domain ?? []).map((domain) => ({ name: (typeof domain === "string" ? domain : domain._ ?? "").trim(), subdomains: attributes(domain).includeSubdomains === "true" }));
    if (permitted) {
      const names = domains.map((domain) => domain.name).join(", ") || "no domain";
      if (!e2e) findings.push(`Android: plain HTTP is allowed for ${names}, and this is not the end-to-end build`);
      else if (domains.length !== 1 || domains[0].name !== "localhost") findings.push(`Android: plain HTTP is allowed for ${names}, not localhost alone`);
      else if (domains[0].subdomains) findings.push("Android: the exception for localhost includes its subdomains");
    }
    walkDomainConfigs(config["domain-config"], e2e, findings);
  }
};

export const androidFindings = ({ manifest, networkSecurityConfig }, { e2e = false } = {}) => {
  const findings = [];
  const [application] = manifest.manifest.application;
  if (attributes(application)["android:usesCleartextTraffic"] === "true") {
    findings.push("Android: android:usesCleartextTraffic is true, which permits plain HTTP to every host");
  }
  if (networkSecurityConfig === undefined) return findings;
  const root = networkSecurityConfig["network-security-config"];
  const [base] = root["base-config"] ?? [];
  if (attributes(base).cleartextTrafficPermitted === "true") {
    findings.push("Android: the network security config's base-config permits plain HTTP to every host");
  }
  walkDomainConfigs(root["domain-config"], e2e, findings);
  return findings;
};

const RESOURCE = /^@xml\/([A-Za-z0-9_]+)$/;

export const checkProject = async (platform, { root = MOBILE, env = process.env } = {}) => {
  if (platform === "ios") {
    const plistPath = join(root, "ios/Kalia/Info.plist");
    if (!existsSync(plistPath)) return [`iOS: ${plistPath} does not exist; prebuild first`];
    return iosFindings(parsePlist(readFileSync(plistPath, "utf8")), { phoneHost: env.KALIA_PHONE_HOST?.trim() || undefined });
  }
  const main = join(root, "android/app/src/main");
  if (!existsSync(join(main, "AndroidManifest.xml"))) return [`Android: ${join(main, "AndroidManifest.xml")} does not exist; prebuild first`];
  const manifest = await XML.readXMLAsync({ path: join(main, "AndroidManifest.xml") });
  const [application] = manifest.manifest.application;
  const reference = attributes(application)["android:networkSecurityConfig"];
  let networkSecurityConfig;
  if (reference !== undefined) {
    const name = RESOURCE.exec(reference)?.[1];
    const file = name && join(main, "res/xml", `${name}.xml`);
    if (!file || !existsSync(file)) return [`Android: the manifest names ${reference}, which the project does not have`];
    networkSecurityConfig = await XML.readXMLAsync({ path: file });
  }
  return androidFindings({ manifest, networkSecurityConfig }, { e2e: env.KALIA_E2E === "1" });
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const platform = process.argv[2];
  if (platform !== "ios" && platform !== "android") {
    process.stderr.write("usage: check-cleartext.mjs ios|android\n");
    process.exit(2);
  }
  const findings = await checkProject(platform);
  if (findings.length > 0) {
    process.stderr.write(`The generated ${platform} project carries a cleartext exception it may not:\n`);
    for (const finding of findings) process.stderr.write(`  ${finding}\n`);
    process.exit(1);
  }
  process.stdout.write(`The generated ${platform} project carries no cleartext exception beyond the one this build allows.\n`);
}
