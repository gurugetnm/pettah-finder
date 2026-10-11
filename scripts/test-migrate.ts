import "dotenv/config";
import { spawnSync } from "node:child_process";
import { testDatabaseUrl } from "../src/lib/validations/test-database";
const url = testDatabaseUrl(
  process.env.TEST_DATABASE_URL,
  process.env.DATABASE_URL,
);
const result = spawnSync("pnpm", ["db:deploy"], {
  env: { ...process.env, DATABASE_URL: url },
  stdio: "inherit",
});
process.exit(result.status ?? 1);
