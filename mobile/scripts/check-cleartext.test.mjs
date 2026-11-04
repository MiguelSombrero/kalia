#!/usr/bin/env node
// Self-test for check-cleartext.mjs. Runs in `npm test --workspace mobile`.
// Each fixture is a small generated project written to a temporary directory;
// the host is invented.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { checkProject, parsePlist } from "./check-cleartext.mjs";

const HOST = "example-mac";

const manifest = (applicationAttributes = "") => `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application android:name=".MainApplication" ${applicationAttributes}>
    <activity android:name=".MainActivity" android:exported="true" />
  </application>
</manifest>`;

const securityConfig = ({ base = "false", domains = [{ name: "localhost" }], permitted = "true" } = {}) => `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="${base}" />
  <domain-config cleartextTrafficPermitted="${permitted}">
${domains.map(({ name, subdomains = "false" }) => `    <domain includeSubdomains="${subdomains}">${name}</domain>`).join("\n")}
  </domain-config>
</network-security-config>`;

const androidProject = ({ applicationAttributes, config }) => ({
  "android/app/src/main/AndroidManifest.xml": manifest(applicationAttributes),
  ...(config === undefined ? {} : { "android/app/src/main/res/xml/network_security_config.xml": config }),
});

const REFERENCE = 'android:networkSecurityConfig="@xml/network_security_config"';

const plist = (security) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>NSAppTransportSecurity</key>
    <dict>
${security}
    </dict>
  </dict>
</plist>`;

const STOCK = "<key>NSAllowsArbitraryLoads</key><false/><key>NSAllowsLocalNetworking</key><true/>";
const exception = (domain, body = "<key>NSExceptionAllowsInsecureHTTPLoads</key><true/>") =>
  `<key>NSExceptionDomains</key><dict><key>${domain}</key><dict>${body}</dict></dict>`;
const iosProject = (security) => ({ "ios/Kalia/Info.plist": plist(security) });

const check = async (platform, files, env) => {
  const root = mkdtempSync(join(tmpdir(), "kalia-cleartext-"));
  try {
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), content);
    }
    return await checkProject(platform, { root, env });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

test("an Android project with no exception passes, with or without the end-to-end flag", async () => {
  assert.deepEqual(await check("android", androidProject({}), {}), []);
  assert.deepEqual(await check("android", androidProject({}), { KALIA_E2E: "1" }), []);
});

test("an Android project whose only exception is localhost, in the end-to-end build, passes", async () => {
  const files = androidProject({ applicationAttributes: REFERENCE, config: securityConfig() });
  assert.deepEqual(await check("android", files, { KALIA_E2E: "1" }), []);
});

test("Android's localhost exception left behind by an end-to-end build fails any other build", async () => {
  const files = androidProject({ applicationAttributes: REFERENCE, config: securityConfig() });
  const findings = await check("android", files, {});
  assert.equal(findings.length, 1);
  assert.match(findings[0], /localhost.*not the end-to-end build/);
});

test("an app-wide Android flag fails, even in the end-to-end build", async () => {
  const files = androidProject({ applicationAttributes: 'android:usesCleartextTraffic="true"' });
  for (const env of [{}, { KALIA_E2E: "1" }]) {
    const findings = await check("android", files, env);
    assert.equal(findings.length, 1);
    assert.match(findings[0], /usesCleartextTraffic is true/);
  }
});

test("an Android base-config that permits cleartext fails", async () => {
  const files = androidProject({ applicationAttributes: REFERENCE, config: securityConfig({ base: "true" }) });
  assert.match((await check("android", files, { KALIA_E2E: "1" }))[0], /base-config permits plain HTTP to every host/);
});

test("an Android exception for any host but localhost fails, whatever else it names", async () => {
  for (const domains of [[{ name: HOST }], [{ name: "localhost" }, { name: HOST }], [{ name: "localhost", subdomains: "true" }]]) {
    const files = androidProject({ applicationAttributes: REFERENCE, config: securityConfig({ domains }) });
    assert.equal((await check("android", files, { KALIA_E2E: "1" })).length, 1, JSON.stringify(domains));
  }
});

test("a manifest that names a network security config the project lacks fails", async () => {
  const files = androidProject({ applicationAttributes: REFERENCE });
  assert.match((await check("android", files, { KALIA_E2E: "1" }))[0], /which the project does not have/);
});

test("Android's debug overlay, which the release build does not merge, is not read", async () => {
  const files = {
    ...androidProject({}),
    "android/app/src/debug/AndroidManifest.xml": manifest('android:usesCleartextTraffic="true"'),
  };
  assert.deepEqual(await check("android", files, {}), []);
});

test("an iOS project with Expo's stock settings passes, in both modes", async () => {
  assert.deepEqual(await check("ios", iosProject(STOCK), {}), []);
  assert.deepEqual(await check("ios", iosProject(STOCK), { KALIA_PHONE_HOST: HOST }), []);
});

test("an iOS project whose only exception is the tailnet host, in phone mode, passes", async () => {
  assert.deepEqual(await check("ios", iosProject(STOCK + exception(HOST)), { KALIA_PHONE_HOST: HOST }), []);
  assert.deepEqual(await check("ios", iosProject(STOCK + exception(HOST.toUpperCase())), { KALIA_PHONE_HOST: HOST }), []);
});

test("the tailnet host's exception left behind by a phone-mode build fails a default-mode build", async () => {
  const findings = await check("ios", iosProject(STOCK + exception(HOST)), {});
  assert.equal(findings.length, 1);
  assert.match(findings[0], /phone mode is off/);
});

test("an iOS exception for another host fails, in phone mode too", async () => {
  const findings = await check("ios", iosProject(STOCK + exception("other-mac")), { KALIA_PHONE_HOST: HOST });
  assert.equal(findings.length, 1);
  assert.match(findings[0], /not the tailnet host/);
});

test("an iOS exception that reaches the host's subdomains fails", async () => {
  const body = "<key>NSExceptionAllowsInsecureHTTPLoads</key><true/><key>NSIncludesSubdomains</key><true/>";
  const findings = await check("ios", iosProject(STOCK + exception(HOST, body)), { KALIA_PHONE_HOST: HOST });
  assert.match(findings[0], /subdomains/);
});

test("every app-wide iOS switch fails, in phone mode too", async () => {
  for (const key of ["NSAllowsArbitraryLoads", "NSAllowsArbitraryLoadsInWebContent", "NSAllowsArbitraryLoadsForMedia"]) {
    const findings = await check("ios", iosProject(`<key>${key}</key><true/>`), { KALIA_PHONE_HOST: HOST });
    assert.equal(findings.length, 1, key);
    assert.match(findings[0], new RegExp(`${key} is true`));
  }
});

test("an iOS exception that does not allow plain HTTP is not a cleartext exception", async () => {
  const body = "<key>NSExceptionAllowsInsecureHTTPLoads</key><false/><key>NSExceptionMinimumTLSVersion</key><string>TLSv1.2</string>";
  assert.deepEqual(await check("ios", iosProject(STOCK + exception("other-mac", body)), {}), []);
});

test("a platform without a generated project says to prebuild", async () => {
  assert.match((await check("ios", {}, {}))[0], /prebuild first/);
  assert.match((await check("android", {}, {}))[0], /prebuild first/);
});

test("the plist reader handles nested structures, entities and self-closing values", () => {
  const parsed = parsePlist(`<plist><dict><key>a&amp;b</key><array><string>x</string><string/><integer>3</integer></array><key>c</key><true/></dict></plist>`);
  assert.deepEqual(parsed, { "a&b": ["x", "", 3], c: true });
});
