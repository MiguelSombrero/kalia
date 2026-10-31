// The origins module throws without both; these hosts resolve nowhere.
process.env.EXPO_PUBLIC_API_ORIGIN = "http://api.test";
process.env.EXPO_PUBLIC_KEYCLOAK_ORIGIN = "http://keycloak.test";

/* global jest */
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("expo-secure-store", () => {
  const items = new Map();
  return {
    getItemAsync: async (key) => items.get(key) ?? null,
    setItemAsync: async (key, value) => void items.set(key, value),
    deleteItemAsync: async (key) => void items.delete(key),
  };
});
