module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  testTimeout: 20_000,
  testPathIgnorePatterns: ["/node_modules/", "/eslint-fixtures/"],
};
