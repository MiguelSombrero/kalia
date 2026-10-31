const CALLBACK = /^(?:kalia:\/\/auth\/callback|\/auth\/callback)(?:[?#].*)?$/;

// Expo Router also receives the URL the system browser returns to, and on
// Android that would navigate to a route that does not exist while the
// sign-in is still completing. A regex, not URL: React Native's own URL does
// not implement hostname or pathname.
export const redirectAuthCallback = (path: string): string => (CALLBACK.test(path) ? "/profile" : path);
