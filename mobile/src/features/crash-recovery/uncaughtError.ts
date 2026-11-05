import { useEffect } from "react";
import { create } from "zustand";
import { logUncaught } from "./reportUncaught";

type UncaughtErrorState = { error: Error | undefined };

const useUncaughtErrorStore = create<UncaughtErrorState>(() => ({ error: undefined }));

export const useUncaughtError = (): Error | undefined => useUncaughtErrorStore((state) => state.error);

export const showUncaughtError = (error: Error): void => useUncaughtErrorStore.setState({ error });

export const clearUncaughtError = (): void => useUncaughtErrorStore.setState({ error: undefined });

type GlobalHandler = (error: unknown, isFatal?: boolean) => void;
type ErrorUtilsLike = { getGlobalHandler: () => GlobalHandler; setGlobalHandler: (handler: GlobalHandler) => void };

/**
 * A release build closes the app on a fatal error thrown outside rendering
 * (an event handler, a timer), which no error boundary sees. This logs it and
 * shows the restart screen instead; a development build keeps React Native's
 * own red screen.
 */
export const installUncaughtErrorHandler = (errorUtils: ErrorUtilsLike = ErrorUtils): void => {
  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((thrown, isFatal) => {
    if (__DEV__ || !isFatal) {
      previous(thrown, isFatal);
      return;
    }
    const error = thrown instanceof Error ? thrown : new Error(String(thrown));
    logUncaught(error, "global");
    showUncaughtError(error);
  });
};

export const useLogUncaughtRenderError = (error: Error): void => {
  useEffect(() => {
    logUncaught(error, "render");
  }, [error]);
};
