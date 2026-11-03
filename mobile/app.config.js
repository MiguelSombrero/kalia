const appleTeamId = process.env.KALIA_APPLE_TEAM_ID;

module.exports = ({ config }) => ({
  ...config,
  ios: { ...config.ios, ...(appleTeamId ? { appleTeamId } : {}) },
});
