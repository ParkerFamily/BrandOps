import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { Text, View } from "react-native";
import { BrandOpsScreen } from "@/components/ui/BrandOpsScreen";
import { BrandOpsCard } from "@/components/ui/BrandOpsCard";
import { P } from "@/components/ui/BrandOpsText";
import { SettingsDivider, SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { LEGAL_CONTACT_EMAIL, LEGAL_LAST_UPDATED, LEGAL_WEB_URL } from "@/lib/legal/brandopsLegal";

export default function AboutSettingsScreen() {
  const version = Constants.expoConfig?.version ?? "1.0.0";
  const build = Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode ?? "—";

  return (
    <BrandOpsScreen scroll tabBarInset={false}>
      <BrandOpsCard variant="soft" style={{ marginBottom: 18, gap: 10 }}>
        <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "900", fontSize: 22 }}>BrandOps</Text>
        <P style={{ fontSize: 14, lineHeight: 21 }}>
          BrandOps connects creators and brands for UGC campaigns, AI-assisted review, submissions, and Stripe payouts — mobile
          for action, web for full workspace control.
        </P>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          {["UGC campaigns", "AI review", "Stripe payouts", "Push alerts"].map((pill) => (
            <View
              key={pill}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: "rgba(198,255,0,0.1)",
                borderWidth: 1,
                borderColor: "rgba(198,255,0,0.2)",
              }}
            >
              <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "700", fontSize: 11 }}>{pill}</Text>
            </View>
          ))}
        </View>
      </BrandOpsCard>

      <SettingsSection title="About">
        <SettingsRow icon="information-circle-outline" title="Version" value={`${version} (${build})`} showChevron={false} />
        <SettingsDivider />
        <SettingsRow
          icon="newspaper-outline"
          title="Changelog"
          subtitle="What's new in BrandOps"
          onPress={() => void Linking.openURL(`${LEGAL_WEB_URL}/changelog`)}
        />
        <SettingsDivider />
        <SettingsRow
          icon="pulse-outline"
          title="System status"
          subtitle="Uptime and incident history"
          onPress={() => void Linking.openURL(`${LEGAL_WEB_URL}/status`)}
        />
      </SettingsSection>

      <BrandOpsCard variant="soft" style={{ gap: 6 }}>
        <P style={{ fontSize: 13, color: BrandOpsTheme.colors.subtle }}>Legal updated {LEGAL_LAST_UPDATED}</P>
        <P style={{ fontSize: 13, color: BrandOpsTheme.colors.subtle }}>{LEGAL_WEB_URL}</P>
        <P style={{ fontSize: 13, color: BrandOpsTheme.colors.subtle }}>{LEGAL_CONTACT_EMAIL}</P>
      </BrandOpsCard>
    </BrandOpsScreen>
  );
}
