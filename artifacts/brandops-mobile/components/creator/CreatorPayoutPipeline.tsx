import { Text, View } from "react-native";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import {
  computeCreatorPayoutPipeline,
  formatPipelineAmount,
  type PayoutPipelineStage,
} from "@/lib/creatorPayoutPipeline";
import type { CreatorPayoutSetup } from "@/lib/creatorPayoutSetup";
import type { FirestorePayment } from "@/lib/creatorPaymentsFirestore";
import type { FirestoreSubmission } from "@/lib/submissionsFirestore";

type Props = {
  submissions: FirestoreSubmission[] | undefined;
  payments?: FirestorePayment[];
  payoutSetup: CreatorPayoutSetup | null;
};

function stageTone(stage: PayoutPipelineStage["key"]): string {
  if (stage === "pending_review") return BrandOpsTheme.colors.warning;
  if (stage === "approved") return BrandOpsTheme.colors.lime;
  if (stage === "processing") return BrandOpsTheme.colors.text;
  return BrandOpsTheme.colors.muted;
}

export function CreatorPayoutPipeline({ submissions, payments, payoutSetup }: Props) {
  const stages = computeCreatorPayoutPipeline(submissions, payments, payoutSetup);

  return (
    <View style={{ marginTop: 14, gap: 8 }}>
      <Text style={{ color: BrandOpsTheme.colors.subtle, fontWeight: "800", fontSize: 11, letterSpacing: 0.6 }}>
        PAYOUT STATUS
      </Text>
      {stages.map((stage) => (
        <View
          key={stage.key}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(255,255,255,0.05)",
          }}
        >
          <Text style={{ color: stageTone(stage.key), fontWeight: "800", fontSize: 13 }}>{stage.label}</Text>
          <Text style={{ color: BrandOpsTheme.colors.muted, fontWeight: "700", fontSize: 13 }}>
            {formatPipelineAmount(stage)}
          </Text>
        </View>
      ))}
    </View>
  );
}
