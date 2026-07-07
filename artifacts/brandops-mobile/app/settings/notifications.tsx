import { useCallback, useEffect, useState } from "react";
import * as Linking from "expo-linking";
import { OneSignal } from "react-native-onesignal";
import Toast from "react-native-toast-message";
import { BrandOpsScreen } from "@/components/ui/BrandOpsScreen";
import { BrandOpsButton } from "@/components/ui/BrandOpsButton";
import { P } from "@/components/ui/BrandOpsText";
import { SettingsDivider, SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsToggleRow } from "@/components/settings/SettingsToggleRow";
import { useAuth } from "@/contexts/AuthContext";
import { isOneSignalConfigured } from "@/lib/onesignal/config";
import { linkOneSignalUser } from "@/lib/onesignal/initOneSignal";
import { usePushNotificationStatus } from "@/lib/onesignal/usePushNotificationStatus";
import {
  DEFAULT_NOTIFICATION_PREFS,
  loadNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/settingsPreferences";
import { openAuthenticatedWebSession } from "@/lib/webHandoff";

export default function NotificationSettingsScreen() {
  const { authUid } = useAuth();
  const pushStatus = usePushNotificationStatus();
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFS);

  useEffect(() => {
    void loadNotificationPreferences().then(setPrefs);
  }, []);

  const updatePref = useCallback(async (key: keyof NotificationPreferences, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    await saveNotificationPreferences(next);
  }, [prefs]);

  const enablePush = async () => {
    if (!isOneSignalConfigured() || !authUid) return;
    const granted = await OneSignal.Notifications.requestPermission(true);
    if (granted) {
      await linkOneSignalUser(authUid);
      Toast.show({ type: "success", text1: "Push enabled", text2: "You'll get alerts for key updates." });
    } else {
      Toast.show({
        type: "info",
        text1: "Notifications off",
        text2: "Enable BrandOps in your device Settings app.",
      });
    }
  };

  return (
    <BrandOpsScreen scroll tabBarInset={false}>
      <SettingsSection title="Push notifications" description="Device alerts for time-sensitive updates.">
        <SettingsRow
          icon="notifications-outline"
          title="Push notifications"
          subtitle={pushStatus.label}
          badge={pushStatus.permissionGranted ? "On" : "Off"}
          showChevron={false}
        />
        {pushStatus.permissionGranted !== true && isOneSignalConfigured() ? (
          <BrandOpsButton label="Enable push notifications" onPress={() => void enablePush()} style={{ margin: 12 }} />
        ) : null}
        {pushStatus.permissionGranted === false ? (
          <BrandOpsButton
            label="Open device settings"
            variant="secondary"
            onPress={() => void Linking.openSettings()}
            style={{ marginHorizontal: 12, marginBottom: 12 }}
          />
        ) : null}
      </SettingsSection>

      <SettingsSection
        title="Email & in-app preferences"
        description="Saved on this device. Full email controls sync on web."
      >
        <SettingsToggleRow
          icon="mail-outline"
          title="Email notifications"
          subtitle="Account and workspace emails"
          value={prefs.emailNotifications}
          onValueChange={(v) => void updatePref("emailNotifications", v)}
        />
        <SettingsDivider />
        <SettingsToggleRow
          icon="megaphone-outline"
          title="Campaign updates"
          subtitle="New campaigns, invites, and brief changes"
          value={prefs.campaignUpdates}
          onValueChange={(v) => void updatePref("campaignUpdates", v)}
        />
        <SettingsDivider />
        <SettingsToggleRow
          icon="videocam-outline"
          title="Submission updates"
          subtitle="Reviews, approvals, and revisions"
          value={prefs.submissionUpdates}
          onValueChange={(v) => void updatePref("submissionUpdates", v)}
        />
        <SettingsDivider />
        <SettingsToggleRow
          icon="cash-outline"
          title="Payment alerts"
          subtitle="Payouts and earnings"
          value={prefs.paymentAlerts}
          onValueChange={(v) => void updatePref("paymentAlerts", v)}
        />
        <SettingsDivider />
        <SettingsToggleRow
          icon="sparkles-outline"
          title="Marketing preferences"
          subtitle="Product tips and BrandOps news"
          value={prefs.marketingPreferences}
          onValueChange={(v) => void updatePref("marketingPreferences", v)}
        />
      </SettingsSection>

      <SettingsSection title="Web dashboard">
        <SettingsRow
          icon="globe-outline"
          title="Advanced notification settings"
          subtitle="Digest schedule and team alerts"
          onPress={() => void openAuthenticatedWebSession("settings")}
        />
      </SettingsSection>

      <P style={{ fontSize: 12, marginTop: 4 }}>
        In-app Activity always shows submission and payout updates even when push is disabled.
      </P>
    </BrandOpsScreen>
  );
}
