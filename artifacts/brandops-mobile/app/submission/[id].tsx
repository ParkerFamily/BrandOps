import { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useGetSubmission } from "@workspace/api-client-react";
import { BrandOpsScreen } from "@/components/ui/BrandOpsScreen";
import { BrandOpsCard } from "@/components/ui/BrandOpsCard";
import { BrandOpsButton } from "@/components/ui/BrandOpsButton";
import { H1, H2, P, Label } from "@/components/ui/BrandOpsText";
import { ApiError, ApiLoading, ApiNotConfigured } from "@/components/ui/ApiState";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { ReviewVideoPlayer } from "@/components/review/ReviewVideoPlayer";
import { useAuth } from "@/contexts/AuthContext";
import { isApiConfigured } from "@/lib/apiClient";
import { workspaceApiQuery } from "@/lib/apiQueries";
import { isFirebaseConfigured } from "@/lib/env";
import { canReviewSubmissions } from "@/lib/roleExperience";
import {
  getFirestoreSubmission,
  subscribeFirestoreSubmission,
  type FirestoreSubmission,
} from "@/lib/submissionsFirestore";
import { markCreatorSubmissionViewed } from "@/lib/creatorActivityStorage";

export default function SubmissionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const rawId = id?.trim() ?? "";

  if (!rawId) {
    return (
      <BrandOpsScreen scroll>
        <ApiError message="Missing submission id." />
      </BrandOpsScreen>
    );
  }

  if (isFirebaseConfigured()) {
    return <FirestoreSubmissionDetail submissionDocId={rawId} />;
  }

  if (/^\d+$/.test(rawId) && isApiConfigured()) {
    return <ApiSubmissionDetail submissionId={Number(rawId)} />;
  }

  return (
    <BrandOpsScreen scroll>
      <ApiNotConfigured />
    </BrandOpsScreen>
  );
}

function ApiSubmissionDetail({ submissionId }: { submissionId: number }) {
  const { isAuthenticated } = useAuth();
  const api = workspaceApiQuery(isAuthenticated);
  const { data: submission, isLoading, error, refetch } = useGetSubmission(submissionId, {
    query: api.submission(submissionId),
  });

  if (isLoading && !submission) {
    return (
      <BrandOpsScreen scroll>
        <ApiLoading label="Loading submission…" />
      </BrandOpsScreen>
    );
  }

  if (error || !submission) {
    return (
      <BrandOpsScreen scroll>
        <H1>Submission</H1>
        <ApiError message="Submission not found." onRetry={() => void refetch()} />
      </BrandOpsScreen>
    );
  }

  return (
    <SubmissionDetailLayout
      statusLabel={mapApiStatus(submission.status)}
      campaignTitle={submission.campaign?.title ?? `Campaign #${submission.campaignId}`}
      creatorLabel={submission.creator?.name ?? `#${submission.creatorId}`}
      notes={submission.notes}
      payoutAmount={submission.payoutAmount ?? submission.campaign?.payoutPerVideo ?? 0}
      submittedAt={submission.createdAt}
      updatedAt={submission.updatedAt}
      videoUrl={submission.videoUrl}
    />
  );
}

function canAccessSubmission(submission: FirestoreSubmission, authUid: string | null | undefined): boolean {
  if (!authUid) return false;
  if (submission.creatorFirebaseUid === authUid) return true;
  if (submission.campaignOwnerUid === authUid) return true;
  return false;
}

function FirestoreSubmissionDetail({ submissionDocId }: { submissionDocId: string }) {
  const { authUid } = useAuth();
  const [submission, setSubmission] = useState<FirestoreSubmission | null>(null);
  const [ready, setReady] = useState(false);
  const [listenerError, setListenerError] = useState<string | null>(null);

  useEffect(() => {
    void markCreatorSubmissionViewed(submissionDocId);
  }, [submissionDocId]);

  useEffect(() => {
    setReady(false);
    setListenerError(null);
    setSubmission(null);

    const unsub = subscribeFirestoreSubmission(
      submissionDocId,
      (row) => {
        setSubmission(row);
        setReady(true);
        setListenerError(null);
      },
      (message) => {
        setListenerError(message);
        setReady(true);
      }
    );

    void getFirestoreSubmission(submissionDocId).then((fallback) => {
      if (fallback) {
        setSubmission(fallback);
        setReady(true);
      }
    });

    return () => unsub();
  }, [submissionDocId]);

  const accessDenied = useMemo(() => {
    if (!ready || !submission || !authUid) return false;
    return !canAccessSubmission(submission, authUid);
  }, [ready, submission, authUid]);

  if (!ready && !submission) {
    return (
      <BrandOpsScreen scroll>
        <ApiLoading label="Loading submission…" />
      </BrandOpsScreen>
    );
  }

  if (accessDenied) {
    return (
      <BrandOpsScreen scroll>
        <H1>Submission</H1>
        <ApiError message="You do not have access to this submission." />
      </BrandOpsScreen>
    );
  }

  if (!submission) {
    return (
      <BrandOpsScreen scroll>
        <H1>Submission</H1>
        <ApiError
          message={
            listenerError ??
            "Submission not found. It may have been deleted, or Firestore rules may be blocking read access."
          }
        />
      </BrandOpsScreen>
    );
  }

  return (
    <SubmissionDetailLayout
      statusLabel={mapFirestoreStatus(submission.status)}
      campaignTitle={submission.campaignTitle}
      creatorLabel={submission.creatorName ?? submission.creatorEmail ?? "Creator"}
      notes={submission.notes}
      payoutAmount={submission.payoutAmount ?? 0}
      submittedAt={submission.createdAt.toISOString()}
      updatedAt={submission.createdAt.toISOString()}
      videoUrl={submission.videoUrl}
      storagePath={submission.storagePath}
      submissionType={submission.submissionType}
      revisionCta={submission.status === "revision_requested"}
    />
  );
}

function SubmissionDetailLayout(props: {
  statusLabel: string;
  campaignTitle: string;
  creatorLabel: string;
  notes?: string | null;
  payoutAmount: number;
  submittedAt: string;
  updatedAt: string;
  videoUrl?: string | null;
  storagePath?: string | null;
  submissionType?: "upload" | "link";
  revisionCta?: boolean;
}) {
  const router = useRouter();
  const { role } = useAuth();
  const creatorView = !canReviewSubmissions(role);
  const hasVideo = Boolean(props.storagePath?.trim() || props.videoUrl?.trim());

  return (
    <BrandOpsScreen scroll>
      <Label style={{ color: BrandOpsTheme.colors.lime }}>Submission</Label>
      <H1 style={{ marginTop: 6, marginBottom: 10 }}>Status: {props.statusLabel}</H1>

      {props.revisionCta ? (
        <BrandOpsCard variant="elevated" style={{ marginBottom: 12, borderColor: "rgba(198,255,0,0.25)", borderWidth: 1 }}>
          <P>Revision requested — upload an updated video from the Upload tab.</P>
          <View style={{ height: 10 }} />
          <BrandOpsButton label="Go to Upload" onPress={() => router.push("/(tabs)/upload")} />
        </BrandOpsCard>
      ) : null}

      <BrandOpsCard variant="elevated" style={{ marginBottom: 12, overflow: "hidden", paddingHorizontal: 0, paddingTop: BrandOpsTheme.spacing.md }}>
        <View style={{ paddingHorizontal: BrandOpsTheme.spacing.md }}>
          <H2>{creatorView ? "Your video" : "Submitted video"}</H2>
          {!hasVideo ? (
            <P style={{ marginTop: 10, color: BrandOpsTheme.colors.muted }}>
              No video file was saved on this submission yet.
            </P>
          ) : null}
        </View>
        {hasVideo ? (
          <View style={{ marginTop: 10 }}>
            <ReviewVideoPlayer
              videoUrl={props.videoUrl}
              storagePath={props.storagePath}
              submissionType={props.submissionType}
              aspectRatio={9 / 16}
              maxHeight={440}
            />
          </View>
        ) : null}
        {props.videoUrl ? (
          <Pressable
            onPress={() => void Linking.openURL(props.videoUrl!)}
            style={{ marginTop: 10, paddingHorizontal: BrandOpsTheme.spacing.md }}
          >
            <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "700" }}>Open original in browser</Text>
          </Pressable>
        ) : null}
      </BrandOpsCard>

      <BrandOpsCard variant="elevated" style={{ marginBottom: 12 }}>
        <H2>Campaign</H2>
        <P style={{ marginTop: 8 }}>{props.campaignTitle}</P>
        {!creatorView ? <P style={{ marginTop: 6 }}>Creator: {props.creatorLabel}</P> : null}
      </BrandOpsCard>

      <BrandOpsCard variant="elevated" style={{ marginBottom: 12 }}>
        <H2>Notes</H2>
        <P style={{ marginTop: 8 }}>{props.notes?.trim() ? props.notes : "—"}</P>
      </BrandOpsCard>

      <BrandOpsCard style={{ marginBottom: 12 }}>
        <H2>Payout</H2>
        <P style={{ marginTop: 8 }}>Amount: ${props.payoutAmount}</P>
        <P style={{ marginTop: 6 }}>Payout processes within 3–5 business days after approval.</P>
      </BrandOpsCard>

      <BrandOpsCard>
        <H2>Timeline</H2>
        <View style={{ marginTop: 10, gap: 6 }}>
          <P style={{ color: BrandOpsTheme.colors.text }}>• Submitted: {new Date(props.submittedAt).toLocaleString()}</P>
          <P style={{ color: BrandOpsTheme.colors.text }}>• Updated: {new Date(props.updatedAt).toLocaleString()}</P>
        </View>
      </BrandOpsCard>
    </BrandOpsScreen>
  );
}

function mapApiStatus(s: string) {
  switch (s) {
    case "pending":
      return "Pending Review";
    case "reviewing":
      return "In Review";
    case "revision_requested":
      return "Revision Requested";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "paid":
      return "Paid";
    default:
      return s;
  }
}

function mapFirestoreStatus(s: FirestoreSubmission["status"]) {
  switch (s) {
    case "pending":
      return "Pending Review";
    case "revision_requested":
      return "Revision Requested";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return s;
  }
}
