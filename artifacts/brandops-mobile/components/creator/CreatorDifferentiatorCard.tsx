import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BrandOpsCard } from "@/components/ui/BrandOpsCard";
import { BrandOpsTheme } from "@/constants/brandopsTheme";

const POINTS = [
  "Faster payouts through Stripe Connect",
  "No platform fees on creator earnings",
  "Clear briefs with AI coaching before you submit",
  "Real brand campaigns — not gig marketplace spam",
] as const;

export function CreatorDifferentiatorCard() {
  return (
    <BrandOpsCard variant="soft" style={{ marginBottom: 16, gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name="flash" size={18} color={BrandOpsTheme.colors.lime} />
        <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 16 }}>Why BrandOps?</Text>
      </View>
      {POINTS.map((point) => (
        <View key={point} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
          <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "900" }}>✓</Text>
          <Text style={{ color: BrandOpsTheme.colors.muted, flex: 1, fontSize: 13, lineHeight: 19 }}>{point}</Text>
        </View>
      ))}
    </BrandOpsCard>
  );
}
