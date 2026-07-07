#!/usr/bin/env node
/**
 * pnpm hoists deps to the repo root; React Native expects key packages under this app.
 * Creates symlinks so paths like ./node_modules/expo-router resolve in dev + native builds.
 */
const fs = require("fs");
const path = require("path");

const appRoot = path.join(__dirname, "..");
const workspaceRoot = path.resolve(appRoot, "../..");
const appNodeModules = path.join(appRoot, "node_modules");
const workspaceNodeModules = path.join(workspaceRoot, "node_modules");

const pkg = require(path.join(appRoot, "package.json"));
const packages = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
  // Transitive Metro deps (not in package.json) that native/Metro resolve locally.
  "metro-runtime",
  "@expo/metro-runtime",
];

if (!fs.existsSync(workspaceNodeModules)) {
  console.error("Missing workspace node_modules. Run: pnpm install (from repo root)");
  process.exit(1);
}

fs.mkdirSync(appNodeModules, { recursive: true });

let linked = 0;
for (const name of packages) {
  const src = path.join(workspaceNodeModules, name);
  const dest = path.join(appNodeModules, name);
  if (!fs.existsSync(src)) continue;
  if (fs.existsSync(dest)) {
    try {
      const stat = fs.lstatSync(dest);
      if (stat.isSymbolicLink() || stat.isDirectory()) continue;
    } catch {
      continue;
    }
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const relativeSrc = path.relative(path.dirname(dest), src);
  fs.symlinkSync(relativeSrc, dest);
  linked += 1;
}

console.log(`Linked ${linked} hoisted package(s) into artifacts/brandops-mobile/node_modules`);
