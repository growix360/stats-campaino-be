module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["<rootDir>/src/test/setupEnv.ts"],
  testMatch: ["<rootDir>/src/__tests__/**/*.test.ts"],
  testEnvironmentOptions: {
    NODE_ENV: "test",
  },
  restoreMocks: true,
  coveragePathIgnorePatterns: ["node_modules", "src/config", "src/app.ts", "tests"],
  coverageReporters: ["text", "lcov", "clover", "html"],
}
