#!/usr/bin/env node
/**
 * Kill stale Metro ports, build/install iOS, start bundler, open BrandOps.
 */
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const port = process.env.RCT_METRO_PORT || "8081";
const env = {
  ...process.env,
  RCT_METRO_PORT: port,
  EXPO_DEV_SERVER_PORT: port,
};

spawnSync("node", [path.join(__dirname, "kill-dev-ports.js")], {
  stdio: "inherit",
  cwd: root,
});
spawnSync("node", [path.join(__dirname, "ensure-local-node-modules.js")], {
  stdio: "inherit",
  cwd: root,
});

console.log(`Building BrandOps iOS (Metro port ${port})…`);
const build = spawnSync("npx", ["expo", "run:ios", "--port", port], {
  stdio: "inherit",
  env,
  cwd: root,
  shell: true,
});

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

console.log("\nSkipping Expo auto-open. Opening BrandOps…\n");
const open = spawnSync("node", [path.join(__dirname, "open-ios-dev.js")], {
  stdio: "inherit",
  env,
});
process.exit(open.status ?? 0);
