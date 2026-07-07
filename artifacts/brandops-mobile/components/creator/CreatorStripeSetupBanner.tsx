import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { BrandOpsCard } from "@/components/ui/BrandOpsCard";
import { BrandOpsButton } from "@/components/ui/BrandOpsButton";
import { P } from "@/components/ui/BrandOpsText";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import type { CreatorPayoutSetup } from "@/lib/creatorPayoutSetup";
import { openAuthenticatedWebSession } from "@/lib/webHandoff";

type Props = {
  setup: CreatorPayoutSetup | null;
  compact?: boolean;
};

export function CreatorStripeSetupBanner({ setup, compact }: Props) {
  const [opening, setOpening] = useState(false);

  if (!setup || setup.isFullySetUp) return null;

  const title = setup.stripeConnected ? "Finish Stripe payout setup" : "Connect Stripe to get paid";
  const body = setup.stripeConnected
    ? "Your creator account isn't fully set up until Stripe payouts are enabled. Finish setup before submitting videos."
    : "Your creator account isn't fully set up yet. Connect Stripe so you can submit UGC and receive payouts after approval.";

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
      <BrandOpsButton
        label={opening ? "Opening…" : "Set up Stripe payouts"}
        variant="secondary"
        loading={opening}
        onPress={() => {
          setOpening(true);
          void openAuthenticatedWebSession("payments").finally(() => setOpening(false));
        }}
      />
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
        {ready ? "BrandOps · Ready to earn" : "Setup required · Connect Stripe"}
      </Text>
    </View>
  );
}
