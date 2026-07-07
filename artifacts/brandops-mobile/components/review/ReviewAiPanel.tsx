import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { analyzeSubmissionForReview, type SubmissionReviewAi } from "@/lib/reviewAi";
import type { ReviewSubmission } from "@/lib/submissionUtils";

type Props = {
  item: ReviewSubmission;
  onSuggestNotes?: (notes: string) => void;
};

function recommendationLabel(rec: SubmissionReviewAi["recommendation"]): string {
  if (rec === "approve") return "AI suggests approve";
  if (rec === "reject") return "AI suggests reject";
  return "AI suggests revision";
}

function recommendationColor(rec: SubmissionReviewAi["recommendation"]): string {
  if (rec === "approve") return BrandOpsTheme.colors.lime;
  if (rec === "reject") return BrandOpsTheme.colors.danger;
  return BrandOpsTheme.colors.warning;
}

export function ReviewAiPanel({ item, onSuggestNotes }: Props) {
  const [ai, setAi] = useState<SubmissionReviewAi | null>(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const result = await analyzeSubmissionForReview(item);
      setAi(result);
      if (result.improvements[0]) {
        onSuggestNotes?.(result.improvements.join(" · "));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setAi(null);
    void runAnalysis();
  }, [item.id, item.videoUrl]);

  return (
    <BrandOpsCardShell>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="sparkles" size={16} color={BrandOpsTheme.colors.lime} />
          <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 14 }}>AI review</Text>
        </View>
        <Pressable onPress={() => void runAnalysis()} hitSlop={8}>
          <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "800", fontSize: 12 }}>
            {loading ? "Analyzing…" : "Refresh"}
          </Text>
        </Pressable>
      </View>

      {loading && !ai ? (
        <View style={{ paddingVertical: 16, alignItems: "center" }}>
          <ActivityIndicator color={BrandOpsTheme.colors.lime} />
          <Text style={{ color: BrandOpsTheme.colors.muted, fontSize: 12, marginTop: 8 }}>
            Scoring hook, brand fit, and clarity…
          </Text>
        </View>
      ) : ai ? (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
            <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "900", fontSize: 32 }}>{ai.overallScore}</Text>
            <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 12 }}>/ 100 overall</Text>
          </View>
          <Text style={{ color: recommendationColor(ai.recommendation), fontWeight: "800", fontSize: 13 }}>
            {recommendationLabel(ai.recommendation)}
          </Text>
          <Text style={{ color: BrandOpsTheme.colors.muted, fontSize: 13, lineHeight: 20 }}>{ai.aiNotes}</Text>
          {ai.strengths.slice(0, 2).map((s) => (
            <Text key={s} style={{ color: BrandOpsTheme.colors.muted, fontSize: 12 }}>
              + {s}
            </Text>
          ))}
          {ai.improvements.slice(0, 2).map((s) => (
            <Text key={s} style={{ color: BrandOpsTheme.colors.text, fontSize: 12 }}>
              • {s}
            </Text>
          ))}
          {ai.source === "fallback" ? (
            <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 11 }}>
              Offline summary — connect API for full AI scoring.
            </Text>
          ) : null}
        </View>
      ) : null}
    </BrandOpsCardShell>
  );
}

function BrandOpsCardShell({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        marginTop: 12,
        padding: 14,
        borderRadius: 16,
        backgroundColor: BrandOpsTheme.colors.surface,
        borderWidth: 1,
        borderColor: "rgba(198,255,0,0.15)",
      }}
    >
      {children}
    </View>
  );
}
