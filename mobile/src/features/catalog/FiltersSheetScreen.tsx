import { useRouter } from "expo-router";
import { FiltersSheet } from "./FiltersSheet";
import { useFiltersStore } from "./filters/store";

export const FiltersSheetScreen = () => {
  const router = useRouter();
  const { applied, apply } = useFiltersStore();
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
