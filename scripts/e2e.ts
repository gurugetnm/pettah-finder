import "dotenv/config";
import { spawnSync } from "node:child_process";
import { testDatabaseUrl } from "../src/lib/validations/test-database";
const url = testDatabaseUrl(
  process.env.TEST_DATABASE_URL,
  process.env.DATABASE_URL,
);
const env = {
  ...process.env,
  DATABASE_URL: url,
  SITE_URL: "http://localhost:3100",
};
for (const args of [
  ["db:deploy"],
  ["db:seed"],
  ["exec", "playwright", "test", ...process.argv.slice(2)],
]) {
  const result = spawnSync("pnpm", args, { env, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
