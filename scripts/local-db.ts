import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
const data = resolve(".local/postgres");
function run(command: string, args: string[], quiet = false) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: quiet ? "pipe" : "inherit",
  });
  if (result.error)
    throw new Error(
      `${command} is unavailable. Install PostgreSQL 17+ and add its binaries to PATH.`,
    );
  if (result.status !== 0)
    throw new Error(
      `${command} failed. Review the local PostgreSQL setup; no reset was attempted.`,
    );
  return result.stdout?.trim();
}
if (process.argv.includes("--stop")) {
  if (!existsSync(data)) console.log("No project-local database to stop.");
  else run("pg_ctl", ["-D", data, "stop", "-m", "fast"]);
} else {
  mkdirSync(resolve(".local"), { recursive: true });
  if (!existsSync(resolve(data, "PG_VERSION")))
    run("initdb", ["-D", data, "-A", "trust", "--username=pettah_dev"]);
  const status = spawnSync("pg_ctl", ["-D", data, "status"], {
    stdio: "ignore",
  });
  if (status.error)
    throw new Error(
      "pg_ctl is unavailable. Install PostgreSQL and add its binaries to PATH.",
    );
  if (status.status !== 0)
    run("pg_ctl", [
      "-D",
      data,
      "-l",
      resolve(".local/postgres.log"),
      "-o",
      "-p 55432 -h 127.0.0.1",
      "start",
    ]);
  for (const name of ["pettah_dev", "pettah_test"]) {
    // Names are fixed development constants, not user input.
    const exists = run(
      "psql",
      [
        "-h",
        "127.0.0.1",
        "-p",
        "55432",
        "-U",
        "pettah_dev",
        "-d",
        "postgres",
        "-tAc",
        `SELECT 1 FROM pg_database WHERE datname = '${name}'`,
      ],
      true,
    );
    if (exists !== "1")
      run("createdb", [
        "-h",
        "127.0.0.1",
        "-p",
        "55432",
        "-U",
        "pettah_dev",
        name,
      ]);
  }
  console.log(
    "Project-local PostgreSQL ready on 127.0.0.1:55432 (development and isolated test databases).",
  );
}
