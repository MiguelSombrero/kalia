import { create } from "zustand";

type UncaughtErrorStore = {
  error: Error | undefined;
  show: (error: Error) => void;
  clear: () => void;
};

export const useUncaughtErrorStore = create<UncaughtErrorStore>((set) => ({
  error: undefined,
  show: (error) => set({ error }),
  clear: () => set({ error: undefined }),
}));
