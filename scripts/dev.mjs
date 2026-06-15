import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function createProcess(entry) {
  if (process.platform === "win32") {
    return spawn("cmd.exe", ["/d", "/s", "/c", `npm ${entry.args.join(" ")}`], {
      cwd: rootDir,
      stdio: "inherit",
      shell: false,
      windowsHide: false
    });
  }

  return spawn("npm", entry.args, {
    cwd: rootDir,
    stdio: "inherit",
    shell: false
  });
}

const processes = [
  {
    name: "backend",
    args: ["run", "dev", "--workspace", "@waves/backend"]
  },
  {
    name: "frontend",
    args: ["run", "dev", "--workspace", "@waves/frontend"]
  }
].map((entry) => {
  const child = createProcess(entry);

  child.on("error", (error) => {
    console.error(`${entry.name} failed to start: ${error.message}`);
    stopAll();
    process.exit(1);
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`${entry.name} exited with code ${code}`);
    }
  });

  return child;
});

function stopAll() {
  for (const child of processes) {
    if (!child.killed) {
      child.kill();
    }
  }
}

process.on("SIGINT", () => {
  stopAll();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopAll();
  process.exit(0);
});
