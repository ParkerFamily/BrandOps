import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { BrandOpsScreen } from "@/components/ui/BrandOpsScreen";
import { Avatar } from "@/components/ui/Avatar";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { useAuth } from "@/contexts/AuthContext";
import { canReviewSubmissions } from "@/lib/roleExperience";
import { usePushNotificationStatus } from "@/lib/onesignal/usePushNotificationStatus";
import { useCreatorPayoutSetup } from "@/lib/creatorPayoutSetup";
import { BrandOpsTheme } from "@/constants/brandopsTheme";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, authEmail, authUid, role } = useAuth();
  const isBrand = canReviewSubmissions(role);
  const pushStatus = usePushNotificationStatus();
  const payoutSetup = useCreatorPayoutSetup(isBrand ? null : authUid);

  return (
    <BrandOpsScreen scroll tabBarInset={false}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 22 }}>
        <Avatar name={user?.displayName ?? authEmail ?? "User"} size={56} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 18 }}>
            {user?.displayName ?? "Your account"}
          </Text>
          <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 13, marginTop: 2 }}>{authEmail}</Text>
        </View>
      </View>

      <SettingsSection title="Account">
        <SettingsRow
          icon="person-outline"
          title="Profile & business"
          subtitle="Identity, team, and business details"
          onPress={() => router.push("/settings/account" as never)}
        />
      </SettingsSection>

      {isBrand ? (
        <SettingsSection title="Campaign tools">
          <View style={{ paddingHorizontal: 4, paddingVertical: 8 }}>
            <Text style={{ color: BrandOpsTheme.colors.muted, fontSize: 13, lineHeight: 20 }}>
              Use this app to review creator submissions. Create and manage campaigns from the BrandOps web dashboard in
              your browser.
            </Text>
          </View>
        </SettingsSection>
      ) : (
        <SettingsSection title="Payouts">
          <SettingsRow
            icon="wallet-outline"
            title="Payout account & history"
            subtitle={payoutSetup?.isFullySetUp ? "Payouts enabled" : "Optional — receive pay for approved work"}
            badge={payoutSetup?.isFullySetUp ? "Ready" : undefined}
            onPress={() => router.push("/settings/payouts" as never)}
          />
        </SettingsSection>
      )}

      <SettingsSection title="Notifications">
        <SettingsRow
          icon="notifications-outline"
          title="Push, email & alert preferences"
          subtitle={pushStatus.label}
          onPress={() => router.push("/settings/notifications" as never)}
        />
      </SettingsSection>

      <SettingsSection title="Security">
        <SettingsRow
          icon="lock-closed-outline"
          title="Password & account deletion"
          subtitle="Reset password or permanently delete your account"
          onPress={() => router.push("/settings/security" as never)}
        />
      </SettingsSection>

      {isBrand ? (
        <SettingsSection title="Workspace">
          <SettingsRow
            icon="color-palette-outline"
            title="Brand assets & AI defaults"
            subtitle="Logos, watermarks, auto-approval"
            onPress={() => router.push("/settings/workspace" as never)}
          />
        </SettingsSection>
      ) : null}

      <SettingsSection title="Legal">
        <SettingsRow
          icon="shield-checkmark-outline"
          title="Privacy, terms & agreements"
          onPress={() => router.push("/settings/legal" as never)}
        />
      </SettingsSection>

      <SettingsSection title="Support">
        <SettingsRow
          icon="help-circle-outline"
          title="Help, contact & report issue"
          onPress={() => router.push("/settings/support" as never)}
        />
      </SettingsSection>

      <SettingsSection title="About">
        <SettingsRow
          icon="information-circle-outline"
          title="Version, changelog & status"
          onPress={() => router.push("/settings/about" as never)}
        />
      </SettingsSection>
    </BrandOpsScreen>
  );
}
