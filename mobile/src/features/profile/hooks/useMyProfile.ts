import { queryOptions, useQuery } from "@tanstack/react-query";

import { readMyProfile } from "../api";

export const myProfileQuery = () => queryOptions({ queryKey: ["profile", "me"], queryFn: readMyProfile });

export const useMyProfile = () => useQuery(myProfileQuery());
