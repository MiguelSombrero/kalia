#!/usr/bin/env node
// Self-test for withCleartextExceptions.js. Runs in `npm test --workspace mobile`.
// What a real prebuild does with it is checked by the build targets, which run
// check-cleartext.mjs on the project it generates.

import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

import { androidFindings, iosFindings } from "../scripts/check-cleartext.mjs";

const require = createRequire(import.meta.url);
const { XML } = require("expo/config-plugins");
const { NETWORK_SECURITY_CONFIG, applyToInfoPlist, applyToManifest, phoneHostOf } = require("./withCleartextExceptions.js");

const HOST = "example-mac";
const manifestWith = (attributes) => ({ manifest: { application: [{ $: { "android:name": ".MainApplication", ...attributes } }] } });
const stockPlist = () => ({ NSAppTransportSecurity: { NSAllowsArbitraryLoads: false, NSAllowsLocalNetworking: true } });

test("the end-to-end build names the network security config and drops the app-wide flag", () => {
  const manifest = manifestWith({ "android:usesCleartextTraffic": "true" });
  applyToManifest(manifest, true);
  const [application] = manifest.manifest.application;
  assert.equal(application.$["android:networkSecurityConfig"], "@xml/network_security_config");
  assert.equal("android:usesCleartextTraffic" in application.$, false);
});

test("any other build takes both the flag and the reference out of a project an earlier build left", () => {
  const manifest = manifestWith({ "android:usesCleartextTraffic": "true", "android:networkSecurityConfig": "@xml/network_security_config" });
  applyToManifest(manifest, false);
  const [application] = manifest.manifest.application;
  assert.equal("android:usesCleartextTraffic" in application.$, false);
  assert.equal("android:networkSecurityConfig" in application.$, false);
});

test("what the end-to-end build writes passes the check, and fails the check of any other build", async () => {
  const manifest = manifestWith({});
  applyToManifest(manifest, true);
  const networkSecurityConfig = await XML.parseXMLAsync(NETWORK_SECURITY_CONFIG);
  assert.deepEqual(androidFindings({ manifest, networkSecurityConfig }, { e2e: true }), []);
  assert.equal(androidFindings({ manifest, networkSecurityConfig }, { e2e: false }).length, 1);
});

test("phone mode adds an exception for the one host to the stock settings, and keeps those", () => {
  const plist = stockPlist();
  applyToInfoPlist(plist, HOST);
  assert.deepEqual(plist.NSAppTransportSecurity, {
    NSAllowsArbitraryLoads: false,
    NSAllowsLocalNetworking: true,
    NSExceptionDomains: { [HOST]: { NSExceptionAllowsInsecureHTTPLoads: true } },
  });
  assert.deepEqual(iosFindings(plist, { phoneHost: HOST }), []);
});

test("a build with phone mode off takes the previous build's exception out", () => {
  const plist = stockPlist();
  applyToInfoPlist(plist, HOST);
  applyToInfoPlist(plist, undefined);
  assert.deepEqual(plist, stockPlist());
});

test("the host is read from the environment, trimmed, and an unset or empty one is no host", () => {
  assert.equal(phoneHostOf({ KALIA_PHONE_HOST: ` ${HOST} ` }), HOST);
  assert.equal(phoneHostOf({ KALIA_PHONE_HOST: "" }), undefined);
  assert.equal(phoneHostOf({}), undefined);
});

test("a value that is not a host name is refused, so it cannot reach the plist as a key", () => {
  for (const value of ["a b", "<x>", "host/path", "-host", "ho$t"]) {
    assert.throws(() => phoneHostOf({ KALIA_PHONE_HOST: value }), /KALIA_PHONE_HOST/, value);
  }
});
