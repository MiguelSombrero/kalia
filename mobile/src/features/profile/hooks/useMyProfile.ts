import { useQuery } from "@tanstack/react-query";
import { readMyProfile } from "../api";

export const myProfileKey = ["profile", "me"] as const;

export const useMyProfile = () => useQuery({ queryKey: myProfileKey, queryFn: readMyProfile, retry: false });
