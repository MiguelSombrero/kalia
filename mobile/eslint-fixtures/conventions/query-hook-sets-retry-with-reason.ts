import { queryOptions, useQuery } from "@tanstack/react-query";

const thingQuery = () =>
  queryOptions({
    queryKey: ["thing"],
    queryFn: async () => 1,
    // eslint-disable-next-line no-restricted-syntax -- a list the screen shows no error for retries quietly
    retry: 3,
  });

export const useThing = () => useQuery(thingQuery());
