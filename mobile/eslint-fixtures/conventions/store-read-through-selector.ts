import { useFiltersStore } from "@/features/catalog/filters/store";

export const useApplied = () => useFiltersStore((state) => state.applied);
