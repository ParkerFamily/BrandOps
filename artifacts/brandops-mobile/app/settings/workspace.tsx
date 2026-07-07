import { BrandOpsScreen } from "@/components/ui/BrandOpsScreen";
import { SettingsDivider, SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { openAuthenticatedWebSession } from "@/lib/webHandoff";

export default function WorkspaceSettingsScreen() {
  return (
    <BrandOpsScreen scroll tabBarInset={false}>
      <SettingsSection title="Brand assets" description="Logos, watermarks, and colors sync from your web workspace.">
        <SettingsRow icon="image-outline" title="Logos" subtitle="Primary and alternate marks" onPress={() => void openAuthenticatedWebSession("settings")} />
        <SettingsDivider />
        <SettingsRow icon="water-outline" title="Watermarks" subtitle="Default export watermark" onPress={() => void openAuthenticatedWebSession("settings")} />
        <SettingsDivider />
        <SettingsRow icon="color-palette-outline" title="Brand colors" subtitle="Palette for exports and briefs" onPress={() => void openAuthenticatedWebSession("settings")} />
        <SettingsDivider />
        <SettingsRow icon="people-circle-outline" title="Team permissions" subtitle="Who can approve, pay, and publish" onPress={() => void openAuthenticatedWebSession("team")} />
      </SettingsSection>

      <SettingsSection title="AI settings">
        <SettingsRow icon="text-outline" title="Caption defaults" subtitle="Tone and length for AI captions" onPress={() => void openAuthenticatedWebSession("settings")} />
        <SettingsDivider />
        <SettingsRow icon="layers-outline" title="Watermark defaults" subtitle="AI export watermark behavior" onPress={() => void openAuthenticatedWebSession("settings")} />
        <SettingsDivider />
        <SettingsRow icon="download-outline" title="Export defaults" subtitle="Format, resolution, and naming" onPress={() => void openAuthenticatedWebSession("settings")} />
        <SettingsDivider />
        <SettingsRow icon="checkmark-done-outline" title="Auto-approval rules" subtitle="When AI scores can auto-approve" onPress={() => void openAuthenticatedWebSession("settings")} />
        <SettingsDivider />
        <SettingsRow icon="sparkles-outline" title="AI processing preferences" subtitle="Enhancement and transcript options" onPress={() => void openAuthenticatedWebSession("settings")} />
      </SettingsSection>
    </BrandOpsScreen>
  );
}
