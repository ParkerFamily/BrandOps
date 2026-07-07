import AsyncStorage from "@react-native-async-storage/async-storage";

const NOTIFICATION_PREFS_KEY = "brandops:notificationPrefs:v1";

export type NotificationPreferences = {
  emailNotifications: boolean;
  campaignUpdates: boolean;
  submissionUpdates: boolean;
  paymentAlerts: boolean;
  marketingPreferences: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  emailNotifications: true,
  campaignUpdates: true,
  submissionUpdates: true,
  paymentAlerts: true,
  marketingPreferences: false,
};

export async function loadNotificationPreferences(): Promise<NotificationPreferences> {
  const raw = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
  if (!raw) return DEFAULT_NOTIFICATION_PREFS;
  try {
    return { ...DEFAULT_NOTIFICATION_PREFS, ...(JSON.parse(raw) as Partial<NotificationPreferences>) };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

export async function saveNotificationPreferences(prefs: NotificationPreferences): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
}
