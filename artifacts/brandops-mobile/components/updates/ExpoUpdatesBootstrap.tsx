import { useEffect } from "react";
import * as Updates from "expo-updates";

/** Fetch and apply EAS Update bundles in production TestFlight builds. */
export function ExpoUpdatesBootstrap() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;

    void (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable) return;

        await Updates.fetchUpdateAsync();
        // Apply on next cold start — reloadAsync mid-session crashes expo-video native players.
      } catch {
        // OTA unavailable or network error — app keeps running on embedded bundle
      }
    })();
  }, []);

  return null;
}
