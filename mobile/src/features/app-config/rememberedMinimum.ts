import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "kalia.appConfig.minimumBuild";

export const readRememberedMinimum = async (): Promise<number> => {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    const minimum = stored === null || stored === "" ? NaN : Number(stored);
    return Number.isInteger(minimum) && minimum >= 0 ? minimum : 0;
  } catch {
    return 0;
  }
};

export const rememberMinimum = async (minimum: number): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEY, String(minimum));
  } catch {
    // Not remembering only means an offline launch opens; the next answer tries again.
  }
};
