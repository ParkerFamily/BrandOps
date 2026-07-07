import { useRouter } from "expo-router";
import { BrandOpsScreen } from "@/components/ui/BrandOpsScreen";
import { SettingsDivider, SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { canReviewSubmissions } from "@/lib/roleExperience";
import { useAuth } from "@/contexts/AuthContext";
import { openAuthenticatedWebSession } from "@/lib/webHandoff";

export default function LegalSettingsScreen() {
  const router = useRouter();
  const { role } = useAuth();
  const isCreator = !canReviewSubmissions(role);

  return (
    <BrandOpsScreen scroll tabBarInset={false}>
      <SettingsSection title="Legal">
        <SettingsRow
          icon="shield-checkmark-outline"
          title="Privacy Policy"
          subtitle="How we handle your data"
          onPress={() => router.push("/settings/privacy" as never)}
        />
        <SettingsDivider />
        <SettingsRow
          icon="document-text-outline"
          title="Terms of Service"
          subtitle="Rules for using BrandOps"
          onPress={() => router.push("/settings/terms" as never)}
        />
        <SettingsDivider />
        <SettingsRow
          icon="create-outline"
          title="Creator agreement"
          subtitle="UGC submission and payout terms"
          onPress={() => void openAuthenticatedWebSession("settings")}
        />
        {!isCreator ? (
          <>
            <SettingsDivider />
            <SettingsRow
              icon="briefcase-outline"
              title="Brand agreement"
              subtitle="Campaign and usage rights terms"
              onPress={() => void openAuthenticatedWebSession("settings")}
            />
          </>
        ) : null}
      </SettingsSection>
    </BrandOpsScreen>
  );
}
