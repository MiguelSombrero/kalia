import { useQuery } from "@tanstack/react-query";

export const useThing = (id: string) => useQuery({ queryKey: ["thing", id], queryFn: async () => id });
