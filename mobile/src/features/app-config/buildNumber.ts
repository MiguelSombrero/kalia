import { nativeBuildVersion } from "expo-application";

export const ownBuildNumber = (): number | null => {
  if (!nativeBuildVersion) {
    return null;
  }
  const build = Number(nativeBuildVersion);
  return Number.isInteger(build) && build >= 0 ? build : null;
};
