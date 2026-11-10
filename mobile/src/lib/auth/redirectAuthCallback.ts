const CALLBACK = /^(?:kalia:\/\/auth\/callback|\/auth\/callback)(?:[?#].*)?$/;
let activeRequests = 0;

export const withAuthCallbackSuppressed = async <T>(work: () => Promise<T>): Promise<T> => {
  activeRequests += 1;
  try {
    return await work();
  } finally {
    activeRequests -= 1;
  }
};

// React Native's URL does not implement hostname or pathname.
export const redirectAuthCallback = (path: string): string => {
  if (!CALLBACK.test(path)) return path;
  // Do not navigate while AuthSession consumes the same callback; Expo Router ignores an empty redirect.
  return activeRequests > 0 ? "" : "/profile";
};
