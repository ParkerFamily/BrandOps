import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { computeCreatorEarnings, formatUsd } from "@/lib/creatorEarningsMetrics";
import type { FirestoreSubmission } from "@/lib/submissionsFirestore";

type Props = {
  submissions: FirestoreSubmission[] | undefined;
  style?: { marginBottom?: number; marginTop?: number };
};

export function CreatorEarningsCard({ submissions, style }: Props) {
  const earnings = computeCreatorEarnings(submissions);

  return (
    <View style={{ marginTop: style?.marginTop ?? 0, marginBottom: style?.marginBottom ?? 16 }}>
      <LinearGradient
        colors={["rgba(198,255,0,0.24)", "rgba(198,255,0,0.06)", "rgba(255,255,255,0.02)"]}
        style={{ borderRadius: 22, padding: 22, ...BrandOpsTheme.shadow.glow }}
      >
        <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "800", fontSize: 12, letterSpacing: 0.6 }}>
          YOU&apos;VE MADE
        </Text>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 44, marginTop: 6, lineHeight: 48 }}>
          {formatUsd(earnings.totalEarned)}
        </Text>
        <Text style={{ color: BrandOpsTheme.colors.muted, marginTop: 8, fontSize: 14 }}>
          {formatUsd(earnings.earnedThisMonth)} this month · {earnings.approvedCount} approved
        </Text>
        {earnings.pendingCount > 0 ? (
          <Text style={{ color: BrandOpsTheme.colors.text, marginTop: 10, fontSize: 13, fontWeight: "700" }}>
            {formatUsd(earnings.pendingPayout)} pending review ({earnings.pendingCount} submission
            {earnings.pendingCount === 1 ? "" : "s"})
          </Text>
        ) : null}
      </LinearGradient>
    </View>
  );
}
