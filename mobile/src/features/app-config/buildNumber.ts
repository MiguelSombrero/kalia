import { nativeBuildVersion } from "expo-application";

export const ownBuildNumber = (): number | null => {
  const build = Number(nativeBuildVersion);
  return Number.isInteger(build) && build >= 0 && nativeBuildVersion !== null && nativeBuildVersion !== "" ? build : null;
};
