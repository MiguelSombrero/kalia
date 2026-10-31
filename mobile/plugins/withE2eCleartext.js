const { withAndroidManifest } = require("expo/config-plugins");

// Android refuses plain HTTP in a release build, and the end-to-end build
// talks to the stack on localhost over it. Only KALIA_E2E=1 allows it, and a
// prebuild without it takes the attribute back out, so a shipped build never
// carries it.
const withE2eCleartext = (config) =>
  withAndroidManifest(config, (manifestConfig) => {
    const [application] = manifestConfig.modResults.manifest.application;
    if (process.env.KALIA_E2E === "1") {
      application.$["android:usesCleartextTraffic"] = "true";
    } else {
      delete application.$["android:usesCleartextTraffic"];
    }
    return manifestConfig;
  });

module.exports = withE2eCleartext;
