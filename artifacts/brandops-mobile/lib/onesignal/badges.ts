import { OneSignal } from "react-native-onesignal";

/** Clear delivered notifications and reset the app icon badge. */
export async function clearNotificationBadge(): Promise<void> {
  try {
    OneSignal.Notifications.clearAll();
  } catch {
    // Ignore on platforms where badge APIs are unavailable.
  }
}
