import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { BrandOpsCard } from "@/components/ui/BrandOpsCard";
import { BrandOpsButton } from "@/components/ui/BrandOpsButton";
import { H2, P, Label } from "@/components/ui/BrandOpsText";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { isApiConfigured } from "@/lib/apiClient";
import type { FirestoreSubmission } from "@/lib/submissionsFirestore";
import {
  normalizeProcessingStatus,
  startVideoEnhancement,
  type VideoProcessingStatus,
} from "@/lib/videoEnhancementApi";
import { VideoEnhancementPreviewSheet } from "@/components/campaigns/VideoEnhancementPreviewSheet";

type Props = {
  submission: FirestoreSubmission;
};

function processingLabel(status: VideoProcessingStatus): string {
  if (status === "processing") return "BrandOps is enhancing your video — usually 1–2 minutes.";
  if (status === "done") return "Your enhanced preview is ready. Compare versions before sending to the brand.";
  if (status === "error") return "Enhancement failed. You can retry or submit the original video.";
  return "Add captions, brand watermark, CTA overlay, and 9:16 formatting before brand review.";
}

export function SubmissionVideoEnhancement({ submission }: Props) {
  const [starting, setStarting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const status = normalizeProcessingStatus(submission.processingStatus);
  const alreadyChosen = Boolean(submission.creatorApproval?.trim());
  const canEnhance =
    submission.status === "pending" ||
    submission.status === "revision_requested" ||
    status === "processing" ||
    status === "done" ||
    status === "error";

  if (!canEnhance) return null;

  if (alreadyChosen) {
    return (
      <BrandOpsCard variant="soft" style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="checkmark-circle" size={18} color={BrandOpsTheme.colors.lime} />
          <P style={{ fontWeight: "800" }}>
            {submission.creatorApproval === "approved_processed" ? "Enhanced version submitted" : "Original submitted"}
          </P>
        </View>
        <P style={{ marginTop: 8, color: BrandOpsTheme.colors.muted, fontSize: 13 }}>
          Waiting for brand review.
        </P>
      </BrandOpsCard>
    );
  }

  if (!isApiConfigured()) {
    return (
      <BrandOpsCard variant="soft" style={{ marginBottom: 12 }}>
        <Label style={{ color: BrandOpsTheme.colors.lime }}>AI video enhancement</Label>
        <P style={{ marginTop: 8, color: BrandOpsTheme.colors.muted, fontSize: 13 }}>
          Connect the mobile app to the BrandOps API to run AI enhancement from your phone.
        </P>
      </BrandOpsCard>
    );
  }

  const enhance = async () => {
    if (!submission.videoUrl?.trim()) {
      Toast.show({ type: "error", text1: "No video URL", text2: "This submission does not have a video to enhance." });
      return;
    }
    try {
      setStarting(true);
      await startVideoEnhancement({
        submissionId: submission.id,
        videoUrl: submission.videoUrl,
        campaignTitle: submission.campaignTitle,
        brandName: submission.campaignTitle,
      });
      Toast.show({
        type: "success",
        text1: "Processing started",
        text2: "We will notify you here when the enhanced preview is ready.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Try again.";
      Toast.show({ type: "error", text1: "Enhancement failed", text2: message });
    } finally {
      setStarting(false);
    }
  };

  return (
    <>
      <BrandOpsCard variant="elevated" style={{ marginBottom: 12, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="sparkles" size={18} color={BrandOpsTheme.colors.lime} />
          <H2>AI video enhancement</H2>
        </View>
        <P style={{ color: BrandOpsTheme.colors.muted, fontSize: 13, lineHeight: 20 }}>{processingLabel(status)}</P>

        {status === "idle" ? (
          <BrandOpsButton
            label="Enhance with AI"
            variant="secondary"
            loading={starting}
            onPress={() => void enhance()}
          />
        ) : null}

        {status === "processing" ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              padding: 12,
              borderRadius: 12,
              backgroundColor: "rgba(198,255,0,0.08)",
              borderWidth: 1,
              borderColor: "rgba(198,255,0,0.2)",
            }}
          >
            <ActivityIndicator color={BrandOpsTheme.colors.lime} />
            <P style={{ flex: 1, fontWeight: "700" }}>Processing your video…</P>
          </View>
        ) : null}

        {status === "done" ? (
          <BrandOpsButton label="Preview enhanced video" onPress={() => setPreviewOpen(true)} />
        ) : null}

        {status === "error" ? (
          <View style={{ gap: 10 }}>
            {submission.processingError ? (
              <P style={{ color: "#f87171", fontSize: 12 }}>{submission.processingError}</P>
            ) : null}
            <BrandOpsButton label="Retry enhancement" variant="secondary" loading={starting} onPress={() => void enhance()} />
          </View>
        ) : null}
      </BrandOpsCard>

      <VideoEnhancementPreviewSheet
        visible={previewOpen}
        onClose={() => setPreviewOpen(false)}
        submission={submission}
      />
    </>
  );
}

export function submissionEnhancementHint(submission: FirestoreSubmission): string | null {
  const status = normalizeProcessingStatus(submission.processingStatus);
  if (submission.creatorApproval?.trim()) return null;
  if (status === "processing") return "AI enhancing…";
  if (status === "done") return "Enhanced preview ready";
  if (status === "error") return "Enhancement failed";
  return null;
}
