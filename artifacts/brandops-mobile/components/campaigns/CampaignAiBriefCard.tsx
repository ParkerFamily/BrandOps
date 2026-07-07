import { ActivityIndicator, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BrandOpsCard } from "@/components/ui/BrandOpsCard";
import { BrandOpsButton } from "@/components/ui/BrandOpsButton";
import { P } from "@/components/ui/BrandOpsText";
import { BrandOpsTheme } from "@/constants/brandopsTheme";

type Props = {
  summary: string;
  bullets?: string[];
  loading?: boolean;
  source?: "ai" | "fallback";
  title?: string;
  onViewFull?: () => void;
  viewFullLabel?: string;
};

export function CampaignAiBriefCard({
  summary,
  bullets = [],
  loading,
  source,
  title = "AI BRIEF",
  onViewFull,
  viewFullLabel = "View full brief",
}: Props) {
  return (
    <BrandOpsCard
      variant="elevated"
      style={{
        marginBottom: 16,
        padding: 0,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(198,255,0,0.35)",
      }}
    >
      <LinearGradient
        colors={["rgba(198,255,0,0.16)", "rgba(198,255,0,0.04)", "rgba(255,255,255,0.02)"]}
        style={{ padding: 16, gap: 12 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
            <Ionicons name="sparkles" size={18} color={BrandOpsTheme.colors.lime} />
            <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "900", fontSize: 13, letterSpacing: 0.6 }}>
              {title}
            </Text>
          </View>
          {source === "ai" ? (
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 999,
                backgroundColor: BrandOpsTheme.colors.limeSoft,
              }}
            >
              <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "800", fontSize: 10 }}>LIVE</Text>
            </View>
          ) : null}
        </View>

        {loading ? (
          <ActivityIndicator color={BrandOpsTheme.colors.lime} style={{ marginVertical: 8 }} />
        ) : (
          <>
            <Text style={{ color: BrandOpsTheme.colors.text, fontSize: 17, lineHeight: 26, fontWeight: "600" }}>
              {summary}
            </Text>

            {bullets.length > 0 ? (
              <View style={{ gap: 8, marginTop: 4 }}>
                {bullets.map((item) => (
                  <View key={item} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                    <Ionicons name="ellipse" size={6} color={BrandOpsTheme.colors.lime} style={{ marginTop: 8 }} />
                    <P style={{ flex: 1, lineHeight: 22, color: BrandOpsTheme.colors.muted }}>{item}</P>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        )}

        {onViewFull ? (
          <BrandOpsButton label={viewFullLabel} variant="secondary" onPress={onViewFull} />
        ) : null}
      </LinearGradient>
    </BrandOpsCard>
  );
}
