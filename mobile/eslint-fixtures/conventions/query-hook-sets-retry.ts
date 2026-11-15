import { useQuery } from "@tanstack/react-query";

export const useThing = () => useQuery({ queryKey: ["thing"], queryFn: async () => 1, retry: false });
