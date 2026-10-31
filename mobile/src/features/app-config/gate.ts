export type Gate = "open" | "update-required" | "maintenance";

export const decideGate = ({
  build,
  minimum,
  maintenance,
}: {
  build: number | null;
  minimum: number;
  maintenance: boolean;
}): Gate => {
  if (maintenance) {
    return "maintenance";
  }
  return build !== null && build < minimum ? "update-required" : "open";
};

export const minimumFor = (platform: string, minimumBuild: { ios: number; android: number }): number =>
  platform === "ios" ? minimumBuild.ios : minimumBuild.android;
