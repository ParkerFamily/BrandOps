import * as Haptics from "expo-haptics";

/** No-op when native ExpoHaptics isn't linked (simulator, web, stale dev build). */
async function run(fn: () => Promise<void>) {
  try {
    await fn();
  } catch {
    // UnavailabilityError or missing native module
  }
}

export const safeHaptics = {
  impactLight: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  impactMedium: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  selection: () => run(() => Haptics.selectionAsync()),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
};
