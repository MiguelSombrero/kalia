const { buildNumberAt } = require("./buildNumber");

// Expo evaluates this file more than once in a prebuild; both platforms get the
// build number of the first evaluation.
let buildNumber;

module.exports = ({ config }) => {
  buildNumber ??= buildNumberAt(Date.now());
  const appleTeamId = process.env.KALIA_APPLE_TEAM_ID;
  return {
    ...config,
    ios: { ...config.ios, buildNumber: String(buildNumber), ...(appleTeamId ? { appleTeamId } : {}) },
    android: { ...config.android, versionCode: buildNumber },
  };
};
