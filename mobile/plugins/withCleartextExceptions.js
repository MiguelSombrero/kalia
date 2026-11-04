const { withAndroidManifest, withDangerousMod, withInfoPlist } = require("expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");

// A release build refuses plain HTTP on both platforms, so the only builds that
// may dial it get a narrow exception, written fresh at every prebuild and taken
// out again by any prebuild that does not ask for it (ADR-0097):
//   Android: `localhost` only, under KALIA_E2E=1, in a network security config.
//   iOS: the tailnet host only, in phone mode (KALIA_PHONE_HOST), in App
//   Transport Security's per-domain exceptions.
// Neither is app-wide, and `mobile/scripts/check-cleartext.mjs` fails a project that
// carries anything else.
const NETWORK_SECURITY_CONFIG_RESOURCE = "@xml/network_security_config";
const NETWORK_SECURITY_CONFIG_PATH = "app/src/main/res/xml/network_security_config.xml";

const NETWORK_SECURITY_CONFIG = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false" />
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">localhost</domain>
  </domain-config>
</network-security-config>
`;

const HOST = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i;

const isE2e = (env) => env.KALIA_E2E === "1";

const phoneHostOf = (env) => {
  const host = env.KALIA_PHONE_HOST?.trim();
  if (host && (host.length > 253 || !HOST.test(host))) {
    throw new Error("KALIA_PHONE_HOST must be the Mac's name on the tailnet: letters, digits, hyphens and dots only");
  }
  return host || undefined;
};

const applyToManifest = (manifest, e2e) => {
  const [application] = manifest.manifest.application;
  delete application.$["android:usesCleartextTraffic"];
  if (e2e) application.$["android:networkSecurityConfig"] = NETWORK_SECURITY_CONFIG_RESOURCE;
  else delete application.$["android:networkSecurityConfig"];
};

const applyToInfoPlist = (plist, host) => {
  const security = plist.NSAppTransportSecurity ?? {};
  delete security.NSExceptionDomains;
  if (host) security.NSExceptionDomains = { [host]: { NSExceptionAllowsInsecureHTTPLoads: true } };
  plist.NSAppTransportSecurity = security;
};

const withCleartextExceptions = (config) => {
  const withManifest = withAndroidManifest(config, (manifestConfig) => {
    applyToManifest(manifestConfig.modResults, isE2e(process.env));
    return manifestConfig;
  });
  const withConfigFile = withDangerousMod(withManifest, [
    "android",
    (fileConfig) => {
      const file = path.join(fileConfig.modRequest.platformProjectRoot, NETWORK_SECURITY_CONFIG_PATH);
      if (isE2e(process.env)) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, NETWORK_SECURITY_CONFIG);
      } else {
        fs.rmSync(file, { force: true });
      }
      return fileConfig;
    },
  ]);
  return withInfoPlist(withConfigFile, (plistConfig) => {
    applyToInfoPlist(plistConfig.modResults, phoneHostOf(process.env));
    return plistConfig;
  });
};

module.exports = withCleartextExceptions;
module.exports.NETWORK_SECURITY_CONFIG = NETWORK_SECURITY_CONFIG;
module.exports.applyToManifest = applyToManifest;
module.exports.applyToInfoPlist = applyToInfoPlist;
module.exports.phoneHostOf = phoneHostOf;
