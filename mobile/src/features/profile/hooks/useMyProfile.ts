import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { readMyProfile } from "../api";

export const myProfileKey = ["profile", "me"] as const;

// Removed on unmount rather than left to gcTime: 0, which collects on a timer
// and lets a quick sign-in as someone else render the previous username first.
// The effect stays below useQuery: cleanups run in declaration order, and
// removing the query first lets the observer's unsubscribe schedule a gc
// timer on a query that is already gone.
export const useMyProfile = () => {
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: myProfileKey, queryFn: readMyProfile, retry: false });
  useEffect(
    () => () => {
      queryClient.removeQueries({ queryKey: myProfileKey });
    },
    [queryClient],
  );
  return profile;
};
