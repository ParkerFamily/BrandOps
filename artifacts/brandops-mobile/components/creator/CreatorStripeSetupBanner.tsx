import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { BrandOpsCard } from "@/components/ui/BrandOpsCard";
import { BrandOpsButton } from "@/components/ui/BrandOpsButton";
import { P } from "@/components/ui/BrandOpsText";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { useAuth } from "@/contexts/AuthContext";
import type { CreatorPayoutSetup } from "@/lib/creatorPayoutSetup";
import { openCreatorConnectDashboard } from "@/lib/webHandoff";

type Props = {
  setup: CreatorPayoutSetup | null;
  compact?: boolean;
};

export function CreatorStripeSetupBanner({ setup, compact }: Props) {
  const { authUid } = useAuth();
  const [opening, setOpening] = useState(false);

  if (!setup || setup.isFullySetUp) return null;

  const title = setup.stripeConnected ? "Finish payout setup" : "Set up payouts (optional)";
  const body = setup.stripeConnected
    ? "Add bank details so you can receive compensation after brands approve your videos."
    : "Uploading is free. Connect a payout account when you are ready to receive pay for approved work.";

  return (
    <BrandOpsCard
      variant="soft"
      style={{
        marginBottom: compact ? 12 : 16,
        gap: 10,
        borderColor: "rgba(255,201,77,0.35)",
        borderWidth: 1,
      }}
    >
      <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
        <Ionicons name="wallet-outline" size={22} color={BrandOpsTheme.colors.warning} />
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "800", fontSize: 15 }}>{title}</Text>
          <P style={{ fontSize: 13, lineHeight: 20 }}>{body}</P>
        </View>
      </View>
      {authUid ? (
        <BrandOpsButton
          label={opening ? "Opening…" : "Set up payouts"}
          variant="secondary"
          loading={opening}
          onPress={() => {
            setOpening(true);
            void openCreatorConnectDashboard(authUid).finally(() => setOpening(false));
          }}
        />
      ) : null}
    </BrandOpsCard>
  );
}

export function CreatorSetupStatusBadge({ setup }: { setup: CreatorPayoutSetup | null }) {
  if (!setup) return null;

  const ready = setup.isFullySetUp;
  return (
    <View
      style={{
        marginTop: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: ready ? BrandOpsTheme.colors.limeSoft : "rgba(255,201,77,0.12)",
      }}
    >
      <Text
        style={{
          color: ready ? BrandOpsTheme.colors.lime : BrandOpsTheme.colors.warning,
          fontWeight: "800",
          fontSize: 12,
        }}
      >
        {ready ? "Payouts ready" : "Payout setup optional"}
      </Text>
    </View>
  );
}
