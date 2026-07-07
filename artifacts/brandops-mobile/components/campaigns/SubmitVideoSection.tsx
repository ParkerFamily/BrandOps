import { useState } from "react";
import Toast from "react-native-toast-message";
import { View } from "react-native";
import { BrandOpsCard } from "@/components/ui/BrandOpsCard";
import { BrandOpsButton } from "@/components/ui/BrandOpsButton";
import { H2, P } from "@/components/ui/BrandOpsText";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { useAuth } from "@/contexts/AuthContext";
import { createFirestoreSubmission, readCampaignOwnerUid } from "@/lib/submissionsFirestore";
import { pickVideoFromLibrary, recordSubmissionVideo, showVideoSourcePicker, type PickedVideo } from "@/lib/pickSubmissionVideo";
import { uploadSubmissionVideo } from "@/lib/videoUpload";

export function SubmitVideoSection({
  campaignDocId,
  campaignTitle,
  payoutAmount = 0,
}: {
  campaignDocId: string;
  campaignTitle: string;
  payoutAmount?: number;
}) {
  const { authUid, authEmail, user } = useAuth();
  const [picked, setPicked] = useState<PickedVideo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [picking, setPicking] = useState(false);

  const chooseVideo = () => {
    showVideoSourcePicker(async (source) => {
      try {
        setPicking(true);
        const video = source === "camera" ? await recordSubmissionVideo() : await pickVideoFromLibrary();
        if (video) setPicked(video);
      } finally {
        setPicking(false);
      }
    });
  };

  const submit = async () => {
    if (!picked || !authUid) return;
    try {
      setSubmitting(true);
      const ownerUid = await readCampaignOwnerUid(campaignDocId);
      if (!ownerUid) {
        throw new Error("Could not resolve campaign owner. Try again or contact support.");
      }
      const uploaded = await uploadSubmissionVideo(picked.uri, campaignDocId, authUid, {
        fileName: picked.fileName,
        mimeType: picked.mimeType,
      });
      await createFirestoreSubmission({
        campaignDocId,
        campaignTitle,
        campaignOwnerUid: ownerUid,
        creatorFirebaseUid: authUid,
        creatorEmail: authEmail,
        creatorName: user?.displayName ?? null,
        videoUrl: uploaded.downloadUrl,
        storagePath: uploaded.storagePath,
        submissionType: "upload",
        payoutAmount,
        durationMs: picked.durationMs,
      });
      Toast.show({ type: "success", text1: "Video submitted", text2: "Pending brand review." });
      setPicked(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Try again.";
      Toast.show({ type: "error", text1: "Submit failed", text2: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BrandOpsCard variant="elevated" style={{ marginBottom: 12 }}>
      <H2>Submit your video</H2>
      <P style={{ marginTop: 8, color: BrandOpsTheme.colors.muted }}>
        {picked ? `Selected: ${picked.fileName}` : "Choose from photo library or record new."}
      </P>
      <View style={{ height: 12 }} />
      <BrandOpsButton
        label={picked ? "Change video" : "Choose video"}
        variant="secondary"
        loading={picking}
        onPress={chooseVideo}
      />
      <View style={{ height: 10 }} />
      <BrandOpsButton label="Upload & submit" loading={submitting} disabled={!picked || !authUid} onPress={() => void submit()} />
    </BrandOpsCard>
  );
}
