import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Platform } from "react-native";
import { readAppConfig } from "../api";
import { ownBuildNumber } from "../buildNumber";
import { decideGate, minimumFor, type Gate } from "../gate";
import { readRememberedMinimum, rememberMinimum } from "../rememberedMinimum";

export const appConfigKey = ["app-config"] as const;
export const rememberedMinimumKey = ["app-config", "remembered-minimum"] as const;

export const CHECK_INTERVAL_MS = 30_000;

export const useAppGate = (): { gate: Gate | "loading"; checkAgain: () => void; isChecking: boolean } => {
  const remembered = useQuery({
    queryKey: rememberedMinimumKey,
    queryFn: readRememberedMinimum,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const config = useQuery({
    queryKey: appConfigKey,
    queryFn: readAppConfig,
    staleTime: CHECK_INTERVAL_MS,
    retry: false,
  });

  const named = config.data ? minimumFor(Platform.OS, config.data.minimumBuild) : undefined;
  useEffect(() => {
    if (named !== undefined) {
      void rememberMinimum(named);
    }
  }, [named]);

  const checkAgain = () => {
    void config.refetch();
  };

  if (named === undefined && remembered.isPending) {
    return { gate: "loading", checkAgain, isChecking: config.isFetching };
  }
  const gate = decideGate({
    build: ownBuildNumber(),
    minimum: named ?? remembered.data ?? 0,
    maintenance: config.data?.maintenance ?? false,
  });
  return { gate, checkAgain, isChecking: config.isFetching };
};
