import { queryOptions, useQuery } from "@tanstack/react-query";

export const thingQuery = (id: string) => queryOptions({ queryKey: ["thing", id], queryFn: async () => id });

export const useThing = (id: string) => useQuery(thingQuery(id));
