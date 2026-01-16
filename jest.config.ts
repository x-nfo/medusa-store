import type { JestConfigWithTsJest } from "ts-jest"
import { loadEnv } from "@medusajs/utils"

loadEnv("test", process.cwd())

const config: JestConfigWithTsJest = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.spec.ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
  },
  moduleFileExtensions: ["ts", "js", "json"],
  modulePathIgnorePatterns: ["dist/", "<rootDir>/.medusa/"],
  setupFiles: ["./integration-tests/setup.js"],
}

export default config
