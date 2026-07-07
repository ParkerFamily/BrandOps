import { useMemo, useState } from "react";
import { RefreshControl, View } from "react-native";
import { useRouter } from "expo-router";
import { BrandOpsScreen } from "@/components/ui/BrandOpsScreen";
import { BrandOpsCard } from "@/components/ui/BrandOpsCard";
import { BrandOpsButton } from "@/components/ui/BrandOpsButton";
import { H1, H2, P, Label } from "@/components/ui/BrandOpsText";
import { ApiEmpty, ApiLoading } from "@/components/ui/ApiState";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { ReviewFeed } from "@/components/review/ReviewFeed";
import { useAuth } from "@/contexts/AuthContext";
import { canReviewSubmissions } from "@/lib/roleExperience";
import { useCreatorPayoutSetup } from "@/lib/creatorPayoutSetup";
import { CreatorStripeSetupBanner } from "@/components/creator/CreatorStripeSetupBanner";
import { useFirestoreCampaigns } from "@/lib/campaignsFirestore";
import { createFirestoreSubmission, readCampaignOwnerUid } from "@/lib/submissionsFirestore";
import {
  pickVideoFromLibrary,
  recordSubmissionVideo,
  showVideoSourcePicker,
  type PickedVideo,
} from "@/lib/pickSubmissionVideo";
import { uploadSubmissionVideo } from "@/lib/videoUpload";
import { useFirestoreOwnerSubmissions } from "@/lib/useFirestoreOwnerSubmissions";
import { getBrandReviewQueue } from "@/lib/firestoreReviewAdapter";
import { isFirebaseConfigured } from "@/lib/env";
import { usePullToRefresh } from "@/lib/usePullToRefresh";
import Toast from "react-native-toast-message";

export default function UploadScreen() {
  const { role } = useAuth();
  if (!canReviewSubmissions(role)) return <CreatorUploadFlow />;
  return <BrandReviewFlow />;
}

function BrandReviewFlow() {
  const { authUid, role } = useAuth();
  const { campaigns, refetch: refetchCampaigns } = useFirestoreCampaigns({ ownerOnly: true });
  const campaignDocIds = useMemo(() => campaigns.map((c) => c.firestoreDocId), [campaigns]);
  const { submissions, loading } = useFirestoreOwnerSubmissions(null, campaignDocIds);
  const { refreshing, onRefresh } = usePullToRefresh(refetchCampaigns);

  const campaignsByDocId = useMemo(
    () => new Map(campaigns.map((c) => [c.firestoreDocId, c])),
    [campaigns]
  );

  const pending = useMemo(
    () => (authUid ? getBrandReviewQueue(submissions, campaignsByDocId, authUid) : []),
    [submissions, campaignsByDocId, authUid]
  );

  if (!canReviewSubmissions(role) || !authUid) {
    return <CreatorUploadFlow />;
  }

  if (!isFirebaseConfigured()) {
    return (
      <BrandOpsScreen scroll>
        <P>Sign in with Firebase to review submissions.</P>
      </BrandOpsScreen>
    );
  }

  return (
    <ReviewFeed
      submissions={pending}
      refreshing={refreshing}
      onRefresh={() => void onRefresh()}
      loading={loading && pending.length === 0}
    />
  );
}

function CreatorUploadFlow() {
  const router = useRouter();
  const { authUid, authEmail, user } = useAuth();
  const payoutSetup = useCreatorPayoutSetup(authUid);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [picked, setPicked] = useState<PickedVideo | null>(null);
  const [loading, setLoading] = useState(false);
  const [picking, setPicking] = useState(false);

  const { campaigns, loading: campaignsLoading, refetch } = useFirestoreCampaigns({ status: "active" });
  const { refreshing, onRefresh } = usePullToRefresh(refetch);
  const activeDocId = selectedDocId ?? campaigns[0]?.firestoreDocId ?? null;
  const selected = campaigns.find((c) => c.firestoreDocId === activeDocId) ?? null;

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

  return (
    <BrandOpsScreen
      scroll
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={BrandOpsTheme.colors.lime} />
      }
    >
      <H1 style={{ marginBottom: 8 }}>Upload</H1>
      <P style={{ marginBottom: 18, color: BrandOpsTheme.colors.muted }}>Submit UGC to an active campaign.</P>

      <CreatorStripeSetupBanner setup={payoutSetup} compact />

      {campaignsLoading && campaigns.length === 0 ? <ApiLoading label="Loading campaigns…" /> : null}

      <BrandOpsCard variant="soft" style={{ marginBottom: 12 }}>
        <Label style={{ color: BrandOpsTheme.colors.lime }}>Campaign</Label>
        <View style={{ gap: 8, marginTop: 10 }}>
          {campaigns.length === 0 ? (
            <ApiEmpty
              title="No active campaigns"
              body="When brands publish new briefs they'll show up here. Check Home or enable notifications."
              actionLabel="Browse campaigns"
              onAction={() => router.push("/(tabs)/campaigns" as never)}
            />
          ) : (
            campaigns.map((c) => (
              <BrandOpsButton
                key={c.firestoreDocId}
                label={c.title}
                variant={c.firestoreDocId === activeDocId ? "secondary" : "ghost"}
                onPress={() => setSelectedDocId(c.firestoreDocId)}
              />
            ))
          )}
        </View>
      </BrandOpsCard>

      <BrandOpsCard variant="soft" style={{ marginBottom: 12 }}>
        <H2>Video</H2>
        <P style={{ marginTop: 6 }}>
          {picked ? `Selected: ${picked.fileName}` : "Choose from photo library or record new."}
        </P>
        <View style={{ height: 12 }} />
        <BrandOpsButton
          label={picked ? "Change video" : "Choose video"}
          variant="secondary"
          loading={picking}
          onPress={chooseVideo}
        />
      </BrandOpsCard>

      <BrandOpsButton
        label="Submit video"
        loading={loading}
        disabled={!picked || !selected || !authUid || campaignsLoading}
        onPress={async () => {
          if (!picked || !selected || !authUid) return;
          try {
            setLoading(true);
            const ownerUid = await readCampaignOwnerUid(selected.firestoreDocId);
            if (!ownerUid) {
              throw new Error("Could not resolve campaign owner. Try again or contact support.");
            }
            const uploaded = await uploadSubmissionVideo(picked.uri, selected.firestoreDocId, authUid, {
              fileName: picked.fileName,
              mimeType: picked.mimeType,
            });
            await createFirestoreSubmission({
              campaignDocId: selected.firestoreDocId,
              campaignTitle: selected.title,
              campaignOwnerUid: ownerUid,
              creatorFirebaseUid: authUid,
              creatorEmail: authEmail,
              creatorName: user?.displayName ?? null,
              videoUrl: uploaded.downloadUrl,
              storagePath: uploaded.storagePath,
              submissionType: "upload",
              payoutAmount: selected.payoutPerVideo ?? 0,
              durationMs: picked.durationMs,
            });
            Toast.show({ type: "success", text1: "Submitted", text2: `${selected.title} · pending review` });
            setPicked(null);
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Try again.";
            Toast.show({ type: "error", text1: "Submit failed", text2: message });
          } finally {
            setLoading(false);
          }
        }}
      />
    </BrandOpsScreen>
  );
}
