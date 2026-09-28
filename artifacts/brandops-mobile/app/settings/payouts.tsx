import { useState } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BrandOpsScreen } from "@/components/ui/BrandOpsScreen";
import { BrandOpsButton } from "@/components/ui/BrandOpsButton";
import { BrandOpsCard } from "@/components/ui/BrandOpsCard";
import { SettingsDivider, SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { CreatorSetupStatusBadge } from "@/components/creator/CreatorStripeSetupBanner";
import { useAuth } from "@/contexts/AuthContext";
import { useCreatorPayoutSetup } from "@/lib/creatorPayoutSetup";
import { useFirestoreCreatorPayments } from "@/lib/useFirestoreCreatorPayments";
import { computeCreatorEarnings, formatUsd } from "@/lib/creatorEarningsMetrics";
import { useFirestoreMySubmissions } from "@/lib/useFirestoreOwnerSubmissions";
import { openCreatorConnectDashboard } from "@/lib/webHandoff";
import { isApiConfigured } from "@/lib/apiClient";
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
  const [opening, setOpening] = useState(false);

  const paidTotal = payments.filter((p) => p.status === "paid").reduce((s, p) => s + (p.creatorAmount ?? p.amount), 0);
  const pendingTotal = earnings.pendingPayout;

  const apiConfigured = isApiConfigured();

  const openPayoutDashboard = async () => {
    if (!authUid) return;
    setOpening(true);
    try {
      await openCreatorConnectDashboard(authUid);
    } finally {
      setOpening(false);
    }
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

      {!apiConfigured ? (
        <BrandOpsCard
          variant="soft"
          style={{
            marginBottom: 18,
            gap: 10,
            borderColor: "rgba(255,107,107,0.35)",
            borderWidth: 1,
          }}
        >
          <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
            <Ionicons name="warning-outline" size={22} color={BrandOpsTheme.colors.danger} />
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "800", fontSize: 15 }}>
                API not configured
              </Text>
              <Text style={{ color: BrandOpsTheme.colors.muted, fontSize: 13, lineHeight: 20 }}>
                Set EXPO_PUBLIC_API_BASE_URL in your .env file to enable payout account setup and management.
              </Text>
            </View>
          </View>
        </BrandOpsCard>
      ) : null}

      <BrandOpsButton
        label={opening ? "Opening…" : payoutSetup?.isFullySetUp ? "Open payout dashboard" : "Set up payout account"}
        onPress={openPayoutDashboard}
        loading={opening}
        disabled={!apiConfigured}
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
