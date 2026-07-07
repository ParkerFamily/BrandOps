import * as Linking from "expo-linking";
import Toast from "react-native-toast-message";
import { BrandOpsScreen } from "@/components/ui/BrandOpsScreen";
import { SettingsDivider, SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { LEGAL_CONTACT_EMAIL, LEGAL_WEB_URL } from "@/lib/legal/brandopsLegal";
import { openAuthenticatedWebSession } from "@/lib/webHandoff";

export default function SupportSettingsScreen() {
  const openMail = async () => {
    const url = `mailto:${LEGAL_CONTACT_EMAIL}?subject=BrandOps%20Support`;
    const can = await Linking.canOpenURL(url);
    if (!can) {
      Toast.show({ type: "error", text1: "Email not available", text2: LEGAL_CONTACT_EMAIL });
      return;
    }
    await Linking.openURL(url);
  };

  return (
    <BrandOpsScreen scroll tabBarInset={false}>
      <SettingsSection title="Support">
        <SettingsRow
          icon="help-circle-outline"
          title="Help center"
          subtitle="Guides and FAQs"
          onPress={() => void Linking.openURL(`${LEGAL_WEB_URL}/help`)}
        />
        <SettingsDivider />
        <SettingsRow
          icon="mail-outline"
          title="Contact support"
          subtitle={LEGAL_CONTACT_EMAIL}
          onPress={() => void openMail()}
        />
        <SettingsDivider />
        <SettingsRow
          icon="bulb-outline"
          title="Feature requests"
          subtitle="Tell us what to build next"
          onPress={() => void openAuthenticatedWebSession("settings")}
        />
        <SettingsDivider />
        <SettingsRow
          icon="bug-outline"
          title="Report an issue"
          subtitle="Bug reports and account problems"
          onPress={() => void openMail()}
        />
      </SettingsSection>
    </BrandOpsScreen>
  );
}
