#!/usr/bin/env node
/**
 * Open BrandOps on the booted simulator with the correct dev bundle URL.
 */
const { execSync } = require("child_process");

const port = String(process.env.RCT_METRO_PORT || process.env.EXPO_DEV_SERVER_PORT || "8081");
const host = process.env.EXPO_DEV_SERVER_HOST || "127.0.0.1";
const bundleUrl = `http://${host}:${port}`;
const encoded = encodeURIComponent(bundleUrl);

const schemes = [
  `exp+brandops-mobile://expo-development-client/?url=${encoded}`,
  `brandopsmobile://expo-development-client/?url=${encoded}`,
];

function run(cmd, silent = true) {
  try {
    execSync(cmd, { stdio: silent ? "ignore" : "inherit" });
    return true;
  } catch {
    return false;
  }
}

console.log(`BrandOps bundle → ${bundleUrl}`);
console.log("Backgrounding EnterLinkd in simulator…");
run("xcrun simctl terminate booted com.enterlinkd.app");

for (const deepLink of schemes) {
  console.log(`Trying ${deepLink.split("?")[0]}…`);
  if (run(`xcrun simctl openurl booted "${deepLink}"`, false)) {
    console.log("Opened BrandOps dev client.");
    process.exit(0);
  }
}

console.log("Deep link failed — launching BrandOps by bundle id.");
run("xcrun simctl launch booted com.parkerfamily.brandops-mobile", false);
console.log(`If blank: shake device → Configure bundler → ${host}:${port}`);
