import { useState } from "react";
import * as Linking from "expo-linking";
import Toast from "react-native-toast-message";
import { BrandOpsScreen } from "@/components/ui/BrandOpsScreen";
import { SettingsDivider, SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { LEGAL_CONTACT_EMAIL, LEGAL_WEB_URL } from "@/lib/legal/brandopsLegal";
import { openAuthenticatedWebSession } from "@/lib/webHandoff";

export default function SupportSettingsScreen() {
  const [loading, setLoading] = useState<string | null>(null);

  const openMail = async () => {
    const url = `mailto:${LEGAL_CONTACT_EMAIL}?subject=BrandOps%20Support`;
    try {
      const can = await Linking.canOpenURL(url);
      if (!can) {
        Toast.show({
          type: "info",
          text1: "Email app not available",
          text2: `Please email us at ${LEGAL_CONTACT_EMAIL}`,
        });
        return;
      }
      await Linking.openURL(url);
      Toast.show({ type: "success", text1: "Opening email app..." });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Could not open email",
        text2: `Please contact us at ${LEGAL_CONTACT_EMAIL}`,
      });
    }
  };

  const openHelpCenter = async () => {
    setLoading("help");
    try {
      const url = `${LEGAL_WEB_URL}/help`;
      const can = await Linking.canOpenURL(url);
      if (!can) {
        Toast.show({
          type: "error",
          text1: "Cannot open help center",
          text2: `Please visit ${LEGAL_WEB_URL}/help in your browser`,
        });
        return;
      }
      await Linking.openURL(url);
      Toast.show({ type: "success", text1: "Opening help center..." });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Could not open help center",
        text2: error instanceof Error ? error.message : "Please try again later",
      });
    } finally {
      setLoading(null);
    }
  };

  const openFeatureRequests = async () => {
    setLoading("features");
    try {
      const success = await openAuthenticatedWebSession("settings");
      if (success) {
        Toast.show({ type: "success", text1: "Opening BrandOps settings..." });
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Could not open feature requests",
        text2: error instanceof Error ? error.message : "Please try again later",
      });
    } finally {
      setLoading(null);
    }
  };

  const openBugReport = async () => {
    const url = `mailto:${LEGAL_CONTACT_EMAIL}?subject=BrandOps%20Bug%20Report`;
    try {
      const can = await Linking.canOpenURL(url);
      if (!can) {
        Toast.show({
          type: "info",
          text1: "Email app not available",
          text2: `Please email bug reports to ${LEGAL_CONTACT_EMAIL}`,
        });
        return;
      }
      await Linking.openURL(url);
      Toast.show({ type: "success", text1: "Opening email app..." });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Could not open email",
        text2: `Please report bugs to ${LEGAL_CONTACT_EMAIL}`,
      });
    }
  };

  return (
    <BrandOpsScreen scroll tabBarInset={false}>
      <SettingsSection title="Support">
        <SettingsRow
          icon="help-circle-outline"
          title="Help center"
          subtitle="Guides and FAQs"
          onPress={() => void openHelpCenter()}
          disabled={loading === "help"}
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
          onPress={() => void openFeatureRequests()}
          disabled={loading === "features"}
        />
        <SettingsDivider />
        <SettingsRow
          icon="bug-outline"
          title="Report an issue"
          subtitle="Bug reports and account problems"
          onPress={() => void openBugReport()}
        />
      </SettingsSection>
    </BrandOpsScreen>
  );
}
