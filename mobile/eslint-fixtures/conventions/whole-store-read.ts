import { useFiltersStore } from "@/features/catalog/filters/store";

export const useApplied = () => {
  const { applied } = useFiltersStore();
  return applied;
};
