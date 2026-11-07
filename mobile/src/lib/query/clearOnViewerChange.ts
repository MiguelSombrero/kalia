import type { QueryClient } from "@tanstack/react-query";
import type { TokenStore } from "@/lib/auth/tokenStore";

// resetQueries, not clear(): tabs stay mounted while the viewer changes, and a
// mounted query observer does not refetch a query that was removed under it.
// A reset also cancels in-flight fetches, so a late answer lands nowhere.
export const clearOnViewerChange = (tokenStore: TokenStore, queryClient: QueryClient): (() => void) => {
  let status = tokenStore.getState().status;
  return tokenStore.subscribe(() => {
    const previous = status;
    status = tokenStore.getState().status;
    if (previous === "loading" || status === previous) {
      return;
    }
    void queryClient.resetQueries();
  });
};
