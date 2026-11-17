import { queryOptions, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Platform } from "react-native";

import { ownBuildNumber } from "@/lib/build/buildInfo";

import { readAppConfig } from "../api";
import { decideGate, type Gate, minimumFor } from "../gate";
import { readRememberedMinimum, rememberMinimum } from "../rememberedMinimum";

export const CHECK_INTERVAL_MS = 30_000;

export const rememberedMinimumQuery = () =>
  queryOptions({
    queryKey: ["app-config", "remembered-minimum"],
    queryFn: readRememberedMinimum,
    staleTime: Infinity,
    gcTime: Infinity,
    meta: { viewerIndependent: true },
  });

export const appConfigQuery = () =>
  queryOptions({
    queryKey: ["app-config"],
    queryFn: readAppConfig,
    staleTime: CHECK_INTERVAL_MS,
    meta: { viewerIndependent: true },
  });

export const useAppGate = (): { gate: Gate | "loading"; checkAgain: () => void; isChecking: boolean } => {
  const remembered = useQuery(rememberedMinimumQuery());
  const config = useQuery(appConfigQuery());

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
    maintenance: !config.isError && (config.data?.maintenance ?? false),
  });
  return { gate, checkAgain, isChecking: config.isFetching };
};
