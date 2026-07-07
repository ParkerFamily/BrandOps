import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import { LogLevel, OneSignal } from "react-native-onesignal";
import { env, isOneSignalConfigured } from "@/lib/env";
import { ONESIGNAL_PERMISSION_REQUESTED_KEY } from "@/lib/onesignal/configKeys";
import { openNotificationRoute } from "@/lib/onesignal/deepLink";
import { saveOneSignalPlayerId } from "@/lib/onesignal/syncPlayerId";
import type { Router } from "expo-router";

type InitOptions = {
  router: Router;
  firebaseUid?: string | null;
  onPlayerId?: (playerId: string) => void;
};

let initialized = false;

async function getSubscriptionId(): Promise<string | null> {
  try {
    const id = await OneSignal.User.pushSubscription.getIdAsync();
    return id?.trim() || null;
  } catch {
    return null;
  }
}

async function syncPlayerIdForUser(firebaseUid: string, onPlayerId?: (playerId: string) => void) {
  const playerId = await getSubscriptionId();
  if (!playerId) return;
  onPlayerId?.(playerId);
  await saveOneSignalPlayerId(firebaseUid, playerId);
}

async function requestPermissionOnFirstLaunch() {
  const requested = await AsyncStorage.getItem(ONESIGNAL_PERMISSION_REQUESTED_KEY);
  if (requested) return;

  await AsyncStorage.setItem(ONESIGNAL_PERMISSION_REQUESTED_KEY, "1");
  const granted = await OneSignal.Notifications.requestPermission(true);
  if (granted) {
    Toast.show({
      type: "success",
      text1: "Notifications enabled",
      text2: "We'll alert you for approvals, revisions, and payouts.",
    });
  }
}

export async function initOneSignal(options: InitOptions): Promise<() => void> {
  if (initialized || !isOneSignalConfigured()) {
    return () => {};
  }

  const appId = env.onesignalAppId?.trim();
  if (!appId) return () => {};

  if (__DEV__) {
    OneSignal.Debug.setLogLevel(LogLevel.Verbose);
  }

  OneSignal.initialize(appId);
  initialized = true;

  await requestPermissionOnFirstLaunch();

  if (options.firebaseUid) {
    OneSignal.login(options.firebaseUid);
    await syncPlayerIdForUser(options.firebaseUid, options.onPlayerId);
  }

  const clickListener = (event: { notification: { additionalData?: unknown } }) => {
    openNotificationRoute(options.router, event.notification.additionalData);
  };

  const foregroundListener = (event: {
    preventDefault: () => void;
    getNotification: () => { display: () => void };
    notification: { additionalData?: unknown };
  }) => {
    // Allow default foreground display; customize here if needed.
    event.getNotification().display();
  };

  const subscriptionListener = (event: { current: { id?: string | null } }) => {
    const playerId = event.current.id?.trim();
    if (!playerId || !options.firebaseUid) return;
    void saveOneSignalPlayerId(options.firebaseUid, playerId);
    options.onPlayerId?.(playerId);
  };

  OneSignal.Notifications.addEventListener("click", clickListener);
  OneSignal.Notifications.addEventListener("foregroundWillDisplay", foregroundListener);
  OneSignal.User.pushSubscription.addEventListener("change", subscriptionListener);

  return () => {
    OneSignal.Notifications.removeEventListener("click", clickListener);
    OneSignal.Notifications.removeEventListener("foregroundWillDisplay", foregroundListener);
    OneSignal.User.pushSubscription.removeEventListener("change", subscriptionListener);
  };
}

export async function linkOneSignalUser(firebaseUid: string): Promise<string | null> {
  if (!initialized || !isOneSignalConfigured()) return null;
  OneSignal.login(firebaseUid);
  const playerId = await getSubscriptionId();
  if (playerId) {
    await saveOneSignalPlayerId(firebaseUid, playerId);
  }
  return playerId;
}

export async function unlinkOneSignalUser(): Promise<void> {
  if (!initialized || !isOneSignalConfigured()) return;
  OneSignal.logout();
}
