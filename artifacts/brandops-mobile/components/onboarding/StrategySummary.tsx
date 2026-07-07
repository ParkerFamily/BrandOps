import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { H2, Label, P } from "@/components/ui/BrandOpsText";
import type { WorkspaceStrategy } from "@/lib/onboardingStrategy";

type Props = {
  strategy: WorkspaceStrategy;
  workspace: "brand" | "creator";
};

export function StrategySummary({ strategy, workspace }: Props) {
  const creator = workspace === "creator";

  return (
    <View style={{ gap: 16 }}>
      <View>
        <Label style={{ color: BrandOpsTheme.colors.lime }}>AI STRATEGY</Label>
        <H2 style={{ marginTop: 8, fontSize: 26, lineHeight: 32 }}>Your AI strategy is ready</H2>
        <P style={{ marginTop: 8 }}>{strategy.tagline}</P>
      </View>

      <View
        style={{
          borderRadius: 20,
          borderWidth: 1,
          borderColor: "rgba(198,255,0,0.25)",
          backgroundColor: "rgba(198,255,0,0.06)",
          padding: 18,
          gap: 14,
        }}
      >
        {!creator ? <StrategyRow label="Brand" value={strategy.brandLabel} /> : null}
        {!creator ? <StrategyRow label="Goal" value={strategy.goalLabel} /> : null}
        {creator && strategy.experienceLabel ? (
          <StrategyRow label="Experience" value={strategy.experienceLabel} />
        ) : null}
        {creator && strategy.matchTierLabel ? (
          <StrategyRow label="Match tier" value={strategy.matchTierLabel} />
        ) : null}
        {!creator ? (
          <>
            <StrategyRow label="Recommended budget" value={strategy.recommendedBudget} />
            <StrategyRow label="Recommended creators" value={String(strategy.recommendedCreatorCount)} />
          </>
        ) : (
          <StrategyRow label="Payout tier" value={strategy.recommendedBudget} />
        )}

        {creator && strategy.equipmentLabels && strategy.equipmentLabels.length > 0 ? (
          <View>
            <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 11, fontWeight: "800", letterSpacing: 1, marginBottom: 10 }}>
              EQUIPMENT
            </Text>
            {strategy.equipmentLabels.map((item) => (
              <View key={item} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Ionicons name="hardware-chip-outline" size={16} color={BrandOpsTheme.colors.lime} />
                <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "700", fontSize: 14 }}>{item}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View>
          <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 11, fontWeight: "800", letterSpacing: 1, marginBottom: 10 }}>
            {creator ? "YOUR CAPABILITIES" : "CONTENT FOCUS"}
          </Text>
          {strategy.contentFocus.map((item) => (
            <View key={item} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Ionicons name="checkmark-circle" size={16} color={BrandOpsTheme.colors.lime} />
              <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "700", fontSize: 14 }}>{item}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function StrategyRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
      <Text style={{ color: BrandOpsTheme.colors.muted, fontSize: 13, fontWeight: "700" }}>{label}</Text>
      <Text style={{ color: BrandOpsTheme.colors.text, fontSize: 14, fontWeight: "900", textAlign: "right", flex: 1 }}>
        {value}
      </Text>
    </View>
  );
}
