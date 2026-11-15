import { useRouter } from "expo-router";

import { useFiltersStore } from "./filters/store";
import { FiltersSheet } from "./FiltersSheet";

export const FiltersSheetScreen = () => {
  const router = useRouter();
  const applied = useFiltersStore((state) => state.applied);
  const apply = useFiltersStore((state) => state.apply);
  const close = () => router.back();
  return (
    <FiltersSheet
      initial={applied}
      onClose={close}
      onApply={(filters) => {
        apply(filters);
        close();
      }}
    />
  );
};
