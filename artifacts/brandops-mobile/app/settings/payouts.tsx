import { Text, View } from "react-native";
import { BrandOpsScreen } from "@/components/ui/BrandOpsScreen";
import { BrandOpsButton } from "@/components/ui/BrandOpsButton";
import { SettingsDivider, SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { CreatorSetupStatusBadge } from "@/components/creator/CreatorStripeSetupBanner";
import { useAuth } from "@/contexts/AuthContext";
import { useCreatorPayoutSetup } from "@/lib/creatorPayoutSetup";
import { useFirestoreCreatorPayments } from "@/lib/useFirestoreCreatorPayments";
import { computeCreatorEarnings, formatUsd } from "@/lib/creatorEarningsMetrics";
import { useFirestoreMySubmissions } from "@/lib/useFirestoreOwnerSubmissions";
import { openCreatorConnectDashboard } from "@/lib/webHandoff";
import { BrandOpsTheme } from "@/constants/brandopsTheme";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, padding: 14, borderRadius: 14, backgroundColor: BrandOpsTheme.colors.surface }}>
      <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 11, fontWeight: "700" }}>{label}</Text>
      <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 20, marginTop: 6 }}>{value}</Text>
    </View>
  );
}

export default function PayoutSettingsScreen() {
  const { authUid } = useAuth();
  const payoutSetup = useCreatorPayoutSetup(authUid);
  const { submissions } = useFirestoreMySubmissions();
  const { payments } = useFirestoreCreatorPayments();
  const earnings = computeCreatorEarnings(submissions, payments);

  const paidTotal = payments.filter((p) => p.status === "paid").reduce((s, p) => s + (p.creatorAmount ?? p.amount), 0);
  const pendingTotal = earnings.pendingPayout;

  const openPayoutDashboard = () => {
    if (!authUid) return;
    void openCreatorConnectDashboard(authUid);
  };

  return (
    <BrandOpsScreen scroll tabBarInset={false}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 16 }}>Creator payouts</Text>
        <CreatorSetupStatusBadge setup={payoutSetup} />
      </View>

      <Text style={{ color: BrandOpsTheme.colors.muted, fontSize: 13, lineHeight: 20, marginBottom: 16 }}>
        Optional payout setup for receiving compensation after brands approve your work. Uploading to campaigns is always
        free.
      </Text>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 18 }}>
        <Metric label="Paid" value={formatUsd(paidTotal)} />
        <Metric label="Pending" value={formatUsd(pendingTotal)} />
      </View>

      <BrandOpsButton
        label={payoutSetup?.isFullySetUp ? "Open payout dashboard" : "Set up payout account"}
        onPress={openPayoutDashboard}
        style={{ marginBottom: 18 }}
      />

      <SettingsSection title="Earnings">
        <SettingsRow
          icon="cash-outline"
          title="Paid earnings"
          subtitle="Transfers completed for approved work"
          value={formatUsd(paidTotal)}
          showChevron={false}
        />
        <SettingsDivider />
        <SettingsRow
          icon="hourglass-outline"
          title="Pending earnings"
          subtitle="Approved work awaiting transfer"
          value={formatUsd(pendingTotal)}
          showChevron={false}
        />
        <SettingsDivider />
        <SettingsRow
          icon="wallet-outline"
          title="Payout account"
          subtitle="Bank details for creator compensation"
          onPress={openPayoutDashboard}
        />
      </SettingsSection>
    </BrandOpsScreen>
  );
}
