const appJson = require("./app.json");

const configWith = (teamId) => {
  const previous = process.env.KALIA_APPLE_TEAM_ID;
  if (teamId === undefined) delete process.env.KALIA_APPLE_TEAM_ID;
  else process.env.KALIA_APPLE_TEAM_ID = teamId;
  try {
    let resolved;
    jest.isolateModules(() => {
      resolved = require("./app.config.js")({ config: appJson.expo });
    });
    return resolved;
  } finally {
    if (previous === undefined) delete process.env.KALIA_APPLE_TEAM_ID;
    else process.env.KALIA_APPLE_TEAM_ID = previous;
  }
};

describe("app.config.js", () => {
  it("carries the team identifier from the environment into the iOS config", () => {
    expect(configWith("TEAMID0000").ios.appleTeamId).toBe("TEAMID0000");
  });

  it("leaves the config as app.json has it when no team identifier is set", () => {
    expect(configWith(undefined)).toEqual(appJson.expo);
    expect(configWith("")).toEqual(appJson.expo);
  });

  it("keeps the rest of app.json's iOS config beside the team", () => {
    expect(configWith("TEAMID0000").ios.bundleIdentifier).toBe("fi.kalia.app");
  });
});
