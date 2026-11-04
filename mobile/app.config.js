module.exports = ({ config }) => {
  const appleTeamId = process.env.KALIA_APPLE_TEAM_ID;
  return { ...config, ios: { ...config.ios, ...(appleTeamId ? { appleTeamId } : {}) } };
};
