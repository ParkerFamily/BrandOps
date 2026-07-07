import Constants from "expo-constants";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { OneSignal } from "react-native-onesignal";
import Toast from "react-native-toast-message";
import { BrandOpsScreen } from "@/components/ui/BrandOpsScreen";
import { BrandOpsCard } from "@/components/ui/BrandOpsCard";
import { BrandOpsButton } from "@/components/ui/BrandOpsButton";
import { P, Label } from "@/components/ui/BrandOpsText";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { useAuth } from "@/contexts/AuthContext";
import { isOneSignalConfigured } from "@/lib/onesignal/config";
import { linkOneSignalUser } from "@/lib/onesignal/initOneSignal";
import { usePushNotificationStatus } from "@/lib/onesignal/usePushNotificationStatus";
import { LEGAL_CONTACT_EMAIL, LEGAL_LAST_UPDATED, LEGAL_WEB_URL } from "@/lib/legal/brandopsLegal";

type RowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
};

function SettingsRow({ icon, title, subtitle, onPress }: RowProps) {
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingVertical: 14,
            opacity: pressed ? 0.85 : 1,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: BrandOpsTheme.colors.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name={icon} size={20} color={BrandOpsTheme.colors.lime} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "800", fontSize: 16 }}>{title}</Text>
            {subtitle ? (
              <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 12, marginTop: 2 }}>{subtitle}</Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={BrandOpsTheme.colors.subtle} />
        </View>
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { authUid } = useAuth();
  const pushStatus = usePushNotificationStatus();
  const version = Constants.expoConfig?.version ?? "1.0.0";

  const enablePush = async () => {
    if (!isOneSignalConfigured() || !authUid) return;
    const granted = await OneSignal.Notifications.requestPermission(true);
    if (granted) {
      await linkOneSignalUser(authUid);
      Toast.show({
        type: "success",
        text1: "Push notifications enabled",
        text2: "You'll get alerts for approvals, revisions, and payouts.",
      });
    } else {
      Toast.show({
        type: "info",
        text1: "Notifications off",
        text2: "Enable BrandOps in iOS Settings → Notifications.",
      });
    }
  };

  return (
    <BrandOpsScreen scroll tabBarInset={false}>
      {isOneSignalConfigured() ? (
        <>
          <Label style={{ color: BrandOpsTheme.colors.lime, marginBottom: 10 }}>Notifications</Label>
          <BrandOpsCard variant="soft" style={{ marginBottom: 18, gap: 12 }}>
            <P style={{ fontSize: 13 }}>
              Push alerts for submission approvals, revisions, and payouts. In-app Activity always syncs even if push is off.
            </P>
            <P style={{ fontSize: 13, color: BrandOpsTheme.colors.subtle }}>
              Status: {pushStatus.label}
              {__DEV__ ? " · Simulator often cannot receive real push banners" : ""}
            </P>
            {pushStatus.permissionGranted !== true ? (
              <BrandOpsButton label="Enable push notifications" onPress={() => void enablePush()} />
            ) : null}
          </BrandOpsCard>
        </>
      ) : null}

      <Label style={{ color: BrandOpsTheme.colors.lime, marginBottom: 10 }}>Legal</Label>
      <BrandOpsCard variant="soft" style={{ marginBottom: 18, paddingVertical: 4 }}>
        <SettingsRow
          icon="shield-checkmark-outline"
          title="Privacy Policy"
          subtitle="How we collect and use your data"
          onPress={() => router.push("/settings/privacy" as never)}
        />
        <View style={{ height: 1, backgroundColor: BrandOpsTheme.colors.border }} />
        <SettingsRow
          icon="document-text-outline"
          title="Terms of Service"
          subtitle="Rules for using BrandOps"
          onPress={() => router.push("/settings/terms" as never)}
        />
      </BrandOpsCard>

      <Label style={{ color: BrandOpsTheme.colors.lime, marginBottom: 10 }}>About</Label>
      <BrandOpsCard variant="soft" style={{ marginBottom: 18, gap: 8 }}>
        <P style={{ fontSize: 13 }}>BrandOps connects creators and brands for UGC campaigns, submissions, and payouts.</P>
        <P style={{ fontSize: 13, color: BrandOpsTheme.colors.subtle }}>
          App version {version} · Legal updated {LEGAL_LAST_UPDATED}
        </P>
        <P style={{ fontSize: 13, color: BrandOpsTheme.colors.subtle }}>{LEGAL_WEB_URL}</P>
        <P style={{ fontSize: 13, color: BrandOpsTheme.colors.subtle }}>{LEGAL_CONTACT_EMAIL}</P>
      </BrandOpsCard>
    </BrandOpsScreen>
  );
}
