#!/usr/bin/env node
/**
 * Free Metro / Expo dev ports so BrandOps can bind cleanly.
 * Safe to run before start, run:ios, or ios:clean.
 */
const { execSync } = require("child_process");

// Default: only BrandOps Metro (8081). EnterLinkd uses 8082 — do not kill it here.
const ports = (
  process.env.BRANDOPS_KILL_PORTS ||
  "8081"
).split(",").map((p) => p.trim()).filter(Boolean);

function killPort(port) {
  try {
    const pids = execSync(`lsof -ti tcp:${port}`, { encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean);
    for (const pid of pids) {
      try {
        process.kill(Number(pid), "SIGKILL");
        console.log(`Killed PID ${pid} on port ${port}`);
      } catch {
        /* already gone */
      }
    }
  } catch {
    /* nothing listening */
  }
}

console.log("Freeing dev ports:", ports.join(", "));
for (const port of ports) {
  killPort(port);
}
