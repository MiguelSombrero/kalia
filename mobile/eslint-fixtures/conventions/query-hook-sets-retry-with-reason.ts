import { useQuery } from "@tanstack/react-query";

export const useThing = () =>
  useQuery({
    queryKey: ["thing"],
    queryFn: async () => 1,
    // eslint-disable-next-line no-restricted-syntax -- a list the screen shows no error for retries quietly
    retry: 3,
  });
