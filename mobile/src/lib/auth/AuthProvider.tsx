import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { AuthState, SignInResult, TokenStore } from "./tokenStore";

const AuthContext = createContext<TokenStore | undefined>(undefined);

export const AuthProvider = ({ tokenStore, children }: { tokenStore: TokenStore; children: ReactNode }) => (
  <AuthContext.Provider value={tokenStore}>{children}</AuthContext.Provider>
);

export const useAuth = (): { state: AuthState; signIn: (locale: string) => Promise<SignInResult>; signOut: () => Promise<void> } => {
  const tokenStore = useContext(AuthContext);
  if (!tokenStore) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  const state = useSyncExternalStore(tokenStore.subscribe, tokenStore.getState);
  return { state, signIn: tokenStore.signIn, signOut: tokenStore.signOut };
};
