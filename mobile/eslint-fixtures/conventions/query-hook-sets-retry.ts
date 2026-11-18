import { queryOptions, useQuery } from "@tanstack/react-query";

const thingQuery = () => queryOptions({ queryKey: ["thing"], queryFn: async () => 1, retry: false });

export const useThing = () => useQuery(thingQuery());
