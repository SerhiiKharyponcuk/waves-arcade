import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.startsWith("postgres")) {
  throw new Error("DATABASE_URL must point to PostgreSQL. Run this from a protected production environment.");
}

const directory = resolve("backups");
await mkdir(directory, { recursive: true });
const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const output = resolve(directory, `waves-${timestamp}.dump`);

await new Promise((resolvePromise, reject) => {
  const child = spawn("pg_dump", ["--format=custom", "--no-owner", "--no-acl", `--file=${output}`, databaseUrl], {
    stdio: ["ignore", "inherit", "inherit"],
    windowsHide: true
  });
  child.once("error", reject);
  child.once("exit", (code) => code === 0 ? resolvePromise() : reject(new Error(`pg_dump exited with code ${code}`)));
});

console.log(`Database backup created: ${output}. Store it in encrypted private storage.`);
