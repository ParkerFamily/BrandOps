import { useMemo, useState } from "react";
import { TextInput, View, Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { BrandOpsCard } from "@/components/ui/BrandOpsCard";
import { BrandOpsButton } from "@/components/ui/BrandOpsButton";
import { P, Label } from "@/components/ui/BrandOpsText";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useCreatorPayoutSetup } from "@/lib/creatorPayoutSetup";
import { openAuthenticatedWebSession } from "@/lib/webHandoff";
import { createFirestoreSubmission, readCampaignOwnerUid, type FirestoreSubmission } from "@/lib/submissionsFirestore";
import {
  pickVideoFromLibrary,
  recordSubmissionVideo,
  showVideoSourcePicker,
  type PickedVideo,
} from "@/lib/pickSubmissionVideo";
import { uploadSubmissionVideo } from "@/lib/videoUpload";
import { useFirestoreMySubmissions } from "@/lib/useFirestoreOwnerSubmissions";
import { formatShortTime } from "@/lib/format";
import { SubmissionVideoPreview } from "@/components/campaigns/SubmissionVideoPreview";

type Props = {
  campaignDocId: string;
  campaignTitle: string;
  payoutAmount: number;
  canSubmit: boolean;
  onDraftReady?: (draft: { videoUrl: string; localUri?: string }) => void;
  onSubmitted?: () => void;
};

function statusLabel(status: FirestoreSubmission["status"]): string {
  if (status === "pending") return "Pending review";
  if (status === "approved") return "Approved";
  if (status === "revision_requested") return "Revision needed";
  if (status === "rejected") return "Rejected";
  return status;
}

export function CreatorSubmissionSection({
  campaignDocId,
  campaignTitle,
  payoutAmount,
  canSubmit,
  onDraftReady,
  onSubmitted,
}: Props) {
  const router = useRouter();
  const { authUid, authEmail, user } = useAuth();
  const payoutSetup = useCreatorPayoutSetup(authUid);
  const { submissions } = useFirestoreMySubmissions();
  const [picked, setPicked] = useState<PickedVideo | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [picking, setPicking] = useState(false);

  const myCampaignSubmissions = useMemo(
    () =>
      submissions
        .filter((s) => s.campaignDocId === campaignDocId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [submissions, campaignDocId]
  );

  const chooseVideo = () => {
    showVideoSourcePicker(async (source) => {
      try {
        setPicking(true);
        const video = source === "camera" ? await recordSubmissionVideo() : await pickVideoFromLibrary();
        if (!video) return;
        setPicked(video);
        onDraftReady?.({ videoUrl: video.uri, localUri: video.uri });
        Toast.show({ type: "success", text1: "Video selected", text2: video.fileName });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not open your library.";
        Toast.show({ type: "error", text1: "Video picker failed", text2: message });
      } finally {
        setPicking(false);
      }
    });
  };

  const submitVideo = async () => {
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
      Toast.show({ type: "success", text1: "Video submitted", text2: "Saved to BrandOps — pending review." });
      setPicked(null);
      onSubmitted?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Try again.";
      Toast.show({ type: "error", text1: "Submit failed", text2: message });
      if (__DEV__) console.warn("[BrandOps upload] submit failed", err);
    } finally {
      setSubmitting(false);
    }
  };

  const submitLink = async () => {
    const url = linkUrl.trim();
    if (!url || !authUid) return;
    if (!/^https?:\/\//i.test(url)) {
      Toast.show({ type: "error", text1: "Invalid link", text2: "Paste a full https:// video link." });
      return;
    }
    try {
      setSubmitting(true);
      const ownerUid = await readCampaignOwnerUid(campaignDocId);
      if (!ownerUid) {
        Toast.show({ type: "error", text1: "Submit failed", text2: "Could not resolve campaign owner." });
        return;
      }
      await createFirestoreSubmission({
        campaignDocId,
        campaignTitle,
        campaignOwnerUid: ownerUid,
        creatorFirebaseUid: authUid,
        creatorEmail: authEmail,
        creatorName: user?.displayName ?? null,
        videoUrl: url,
        submissionType: "link",
        payoutAmount,
      });
      Toast.show({ type: "success", text1: "Link submitted", text2: "Saved — pending brand review." });
      setLinkUrl("");
      setShowLink(false);
      onDraftReady?.({ videoUrl: url });
      onSubmitted?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Try again.";
      Toast.show({ type: "error", text1: "Submit failed", text2: message });
    } finally {
      setSubmitting(false);
    }
  };

  if (!canSubmit) {
    return (
      <BrandOpsCard style={{ marginBottom: 12 }}>
        <P>This campaign is not accepting submissions yet.</P>
      </BrandOpsCard>
    );
  }

  const payoutReady = payoutSetup?.isFullySetUp ?? false;

  if (!payoutReady) {
    return (
      <>
        <BrandOpsCard variant="soft" style={{ marginBottom: 12, gap: 10 }}>
          <P style={{ fontWeight: "800" }}>Submissions locked until Stripe is set up</P>
          <P style={{ color: BrandOpsTheme.colors.muted, fontSize: 13, lineHeight: 20 }}>
            Connect Stripe payouts so brands can pay you after approval. Your account stays in setup mode until that is
            complete.
          </P>
          <BrandOpsButton
            label="Set up Stripe payouts"
            variant="secondary"
            onPress={() => void openAuthenticatedWebSession("payments")}
          />
        </BrandOpsCard>
        {myCampaignSubmissions.length > 0 ? (
          <BrandOpsCard variant="soft" style={{ marginBottom: 12 }}>
            <Label style={{ color: BrandOpsTheme.colors.lime }}>Your submissions</Label>
            <View style={{ marginTop: 10, gap: 10 }}>
              {myCampaignSubmissions.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => router.push(`/submission/${s.id}` as never)}
                  style={{
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: "rgba(255,255,255,0.06)",
                  }}
                >
                  <P style={{ fontWeight: "800" }}>{statusLabel(s.status)}</P>
                  <P style={{ color: BrandOpsTheme.colors.muted, fontSize: 13, marginTop: 2 }}>
                    {formatShortTime(s.createdAt.toISOString())}
                    {s.submissionType === "upload" ? " · Video upload" : " · Link"}
                  </P>
                  <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "800", fontSize: 12, marginTop: 6 }}>
                    View submission →
                  </Text>
                </Pressable>
              ))}
            </View>
          </BrandOpsCard>
        ) : null}
      </>
    );
  }

  return (
    <>
      <BrandOpsCard variant="elevated" style={{ marginBottom: 12, gap: 10 }}>
        {picked ? (
          <SubmissionVideoPreview video={picked} />
        ) : (
          <P style={{ color: BrandOpsTheme.colors.muted }}>
            Tap below to record a new clip or pick a video from your photo library.
          </P>
        )}
        <BrandOpsButton
          label={picked ? "Change video" : "Record or choose video"}
          loading={picking}
          onPress={chooseVideo}
        />
        <BrandOpsButton
          label={showLink ? "Hide link field" : "Submit link"}
          variant="secondary"
          onPress={() => setShowLink((v) => !v)}
        />
        {showLink ? (
          <View style={{ gap: 10 }}>
            <TextInput
              value={linkUrl}
              onChangeText={(text) => {
                setLinkUrl(text);
                if (/^https?:\/\//i.test(text.trim())) onDraftReady?.({ videoUrl: text.trim() });
              }}
              placeholder="https://drive.google.com/…"
              placeholderTextColor={BrandOpsTheme.colors.subtle}
              autoCapitalize="none"
              style={{
                height: 48,
                borderRadius: 12,
                paddingHorizontal: 14,
                backgroundColor: BrandOpsTheme.colors.surface,
                color: BrandOpsTheme.colors.text,
              }}
            />
            <BrandOpsButton
              label="Submit link"
              loading={submitting}
              disabled={!linkUrl.trim() || !authUid}
              onPress={() => void submitLink()}
            />
          </View>
        ) : null}
        {picked ? (
          <BrandOpsButton
            label="Upload & submit video"
            loading={submitting}
            disabled={!authUid}
            onPress={() => void submitVideo()}
          />
        ) : null}
      </BrandOpsCard>

      {myCampaignSubmissions.length > 0 ? (
        <BrandOpsCard variant="soft" style={{ marginBottom: 12 }}>
          <Label style={{ color: BrandOpsTheme.colors.lime }}>Your submissions</Label>
          <View style={{ marginTop: 10, gap: 10 }}>
            {myCampaignSubmissions.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => router.push(`/submission/${s.id}` as never)}
                style={{
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(255,255,255,0.06)",
                }}
              >
                <P style={{ fontWeight: "800" }}>{statusLabel(s.status)}</P>
                <P style={{ color: BrandOpsTheme.colors.muted, fontSize: 13, marginTop: 2 }}>
                  {formatShortTime(s.createdAt.toISOString())}
                  {s.submissionType === "upload" ? " · Video upload" : " · Link"}
                </P>
                <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "800", fontSize: 12, marginTop: 6 }}>
                  View submission →
                </Text>
              </Pressable>
            ))}
          </View>
        </BrandOpsCard>
      ) : null}
    </>
  );
}
