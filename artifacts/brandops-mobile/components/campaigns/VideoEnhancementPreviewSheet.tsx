import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { BrandOpsButton } from "@/components/ui/BrandOpsButton";
import { P, Label } from "@/components/ui/BrandOpsText";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { ReviewVideoPlayer } from "@/components/review/ReviewVideoPlayer";
import { approveSubmissionVideoChoice } from "@/lib/videoEnhancementApi";
import type { FirestoreSubmission } from "@/lib/submissionsFirestore";

type Props = {
  visible: boolean;
  onClose: () => void;
  submission: FirestoreSubmission;
  onApproved?: () => void;
  /** Brand reviewers only view enhanced output; creators pick which version to submit. */
  viewerRole?: "creator" | "brand";
};

type ActiveView = "original" | "enhanced";

export function VideoEnhancementPreviewSheet({
  visible,
  onClose,
  submission,
  onApproved,
  viewerRole = "creator",
}: Props) {
  const isBrand = viewerRole === "brand";
  const [activeView, setActiveView] = useState<ActiveView>("enhanced");
  const [approving, setApproving] = useState(false);

  const transcript = submission.subtitlesContent?.trim() ?? "";
  const hasEnhanced = Boolean(submission.processedVideoUrl?.trim());

  const handleApprove = async (choice: "processed" | "original") => {
    try {
      setApproving(true);
      await approveSubmissionVideoChoice({ submissionId: submission.id, choice });
      Toast.show({
        type: "success",
        text1: choice === "processed" ? "Enhanced version submitted" : "Original submitted",
        text2: "The brand team will review your video.",
      });
      onApproved?.();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Try again.";
      Toast.show({ type: "error", text1: "Could not submit", text2: message });
    } finally {
      setApproving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: BrandOpsTheme.colors.bg }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: BrandOpsTheme.colors.border,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="sparkles" size={18} color={BrandOpsTheme.colors.lime} />
            <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 18 }}>
              {isBrand ? "AI enhanced preview" : "Preview enhanced video"}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={26} color={BrandOpsTheme.colors.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => setActiveView("original")}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: activeView === "original" ? "rgba(255,255,255,0.12)" : BrandOpsTheme.colors.surface,
              }}
            >
              <Ionicons name="film-outline" size={14} color={BrandOpsTheme.colors.text} />
              <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "700", fontSize: 13 }}>Original</Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveView("enhanced")}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: activeView === "enhanced" ? "rgba(198,255,0,0.15)" : BrandOpsTheme.colors.surface,
              }}
            >
              <Ionicons name="color-wand-outline" size={14} color={BrandOpsTheme.colors.lime} />
              <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "800", fontSize: 13 }}>Enhanced</Text>
            </Pressable>
          </View>

          <View style={{ borderRadius: 16, overflow: "hidden", backgroundColor: "#000" }}>
            {activeView === "enhanced" ? (
              hasEnhanced ? (
                <ReviewVideoPlayer videoUrl={submission.processedVideoUrl} aspectRatio={9 / 16} maxHeight={420} />
              ) : (
                <View style={{ height: 320, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 }}>
                  <Ionicons name="sparkles-outline" size={36} color={BrandOpsTheme.colors.subtle} />
                  <P style={{ textAlign: "center", color: BrandOpsTheme.colors.muted }}>Enhanced version not available yet.</P>
                </View>
              )
            ) : (
              <ReviewVideoPlayer
                videoUrl={submission.videoUrl}
                storagePath={submission.storagePath}
                submissionType={submission.submissionType}
                aspectRatio={9 / 16}
                maxHeight={420}
              />
            )}
          </View>

          <View>
            <Label style={{ color: BrandOpsTheme.colors.lime, marginBottom: 8 }}>Applied enhancements</Label>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {["Auto captions", "Brand watermark", "CTA overlay", "9:16 format"].map((label) => (
                <View
                  key={label}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: "rgba(198,255,0,0.25)",
                    backgroundColor: "rgba(198,255,0,0.08)",
                  }}
                >
                  <Text style={{ color: BrandOpsTheme.colors.lime, fontSize: 11, fontWeight: "700" }}>{label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View>
            <Label style={{ color: BrandOpsTheme.colors.lime, marginBottom: 8 }}>Transcript</Label>
            <View
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: BrandOpsTheme.colors.border,
                backgroundColor: BrandOpsTheme.colors.surface,
                padding: 14,
                minHeight: 120,
              }}
            >
              {transcript ? (
                <P style={{ lineHeight: 22, color: BrandOpsTheme.colors.text }}>{transcript}</P>
              ) : (
                <P style={{ color: BrandOpsTheme.colors.muted }}>
                  Transcript not available yet. Run AI enhancement to generate captions from your audio.
                </P>
              )}
            </View>
          </View>

          {isBrand ? (
            <P style={{ color: BrandOpsTheme.colors.muted, fontSize: 13, lineHeight: 20 }}>
              Captions, brand watermark, and CTA overlay are burned into the enhanced version — same output as BrandOps web.
            </P>
          ) : (
            <View style={{ gap: 10 }}>
              <BrandOpsButton
                label={approving ? "Submitting…" : "Submit enhanced to brand"}
                loading={approving}
                disabled={!hasEnhanced || approving}
                onPress={() => void handleApprove("processed")}
              />
              <BrandOpsButton
                label="Use original instead"
                variant="secondary"
                loading={approving}
                disabled={approving}
                onPress={() => void handleApprove("original")}
              />
            </View>
          )}

          {!isBrand && approving ? (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <ActivityIndicator color={BrandOpsTheme.colors.lime} />
              <P style={{ color: BrandOpsTheme.colors.muted }}>Saving your choice…</P>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}
