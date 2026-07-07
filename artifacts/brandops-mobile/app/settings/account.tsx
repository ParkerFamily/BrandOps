import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { BrandOpsScreen } from "@/components/ui/BrandOpsScreen";
import { Avatar } from "@/components/ui/Avatar";
import { SettingsDivider, SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { useAuth } from "@/contexts/AuthContext";
import { canReviewSubmissions } from "@/lib/roleExperience";
import { openAuthenticatedWebSession } from "@/lib/webHandoff";
import { BrandOpsTheme } from "@/constants/brandopsTheme";

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { user, authEmail, role } = useAuth();
  const isBrand = canReviewSubmissions(role);

  return (
    <BrandOpsScreen scroll tabBarInset={false}>
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        <Avatar name={user?.displayName ?? authEmail ?? "User"} size={72} />
        <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 20, marginTop: 12 }}>
          {user?.displayName ?? "Your profile"}
        </Text>
        <Text style={{ color: BrandOpsTheme.colors.subtle, marginTop: 4 }}>{authEmail}</Text>
      </View>

      <SettingsSection title="Account">
        <SettingsRow
          icon="person-outline"
          title="Profile"
          subtitle="Photo, display name, and workspace identity"
          onPress={() => router.replace("/(tabs)/profile" as never)}
        />
        <SettingsDivider />
        <SettingsRow
          icon="business-outline"
          title="Business information"
          subtitle={isBrand ? "Company name, website, and brand details" : "Creator profile and portfolio links"}
          onPress={() => void openAuthenticatedWebSession("settings")}
        />
        {isBrand ? (
          <>
            <SettingsDivider />
            <SettingsRow
              icon="document-text-outline"
              title="Company details"
              subtitle="Legal entity, address, and tax info"
              onPress={() => void openAuthenticatedWebSession("settings")}
            />
            <SettingsDivider />
            <SettingsRow
              icon="people-outline"
              title="Team members"
              subtitle="Invite teammates and manage roles"
              onPress={() => void openAuthenticatedWebSession("team")}
            />
          </>
        ) : null}
      </SettingsSection>
    </BrandOpsScreen>
  );
}
