const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const workspaceLib = path.resolve(workspaceRoot, "lib");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Expo monorepo defaults + shared lib (do not replace — hoisted deps live at workspace root).
const defaultWatchFolders = config.watchFolders ?? [];
config.watchFolders = [...new Set([...defaultWatchFolders, workspaceLib])];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

function resolvePackageDir(name) {
  for (const base of [projectRoot, workspaceRoot]) {
    try {
      return path.dirname(require.resolve(`${name}/package.json`, { paths: [base] }));
    } catch {
      /* try next */
    }
  }
  return path.resolve(workspaceRoot, "node_modules", name);
}

const pkg = require("./package.json");
const hoistedDeps = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
];

config.resolver.extraNodeModules = Object.fromEntries(
  hoistedDeps.map((name) => [name, resolvePackageDir(name)]),
);

module.exports = config;
