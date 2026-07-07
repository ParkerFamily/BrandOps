import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, Stack } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { BrandOpsScreen } from "@/components/ui/BrandOpsScreen";
import { H1 } from "@/components/ui/BrandOpsText";
import { ApiError, ApiLoading } from "@/components/ui/ApiState";
import { useAuth } from "@/contexts/AuthContext";
import { useFirestoreCampaign, type FirestoreCampaign } from "@/lib/campaignsFirestore";
import { parseCampaignBrief, type CampaignBrief } from "@/lib/campaignBrief";
import { isFirebaseConfigured } from "@/lib/env";
import { getFirebase } from "@/lib/firebase";
import { CreatorCampaignView } from "@/components/campaigns/CreatorCampaignView";
import { BrandCampaignDashboard } from "@/components/campaigns/BrandCampaignDashboard";
import { shouldShowCreatorCampaignView } from "@/lib/campaignDetailView";
import { markCreatorCampaignViewed } from "@/lib/creatorActivityStorage";
import { useFirestoreOwnerSubmissions } from "@/lib/useFirestoreOwnerSubmissions";
import { computeCampaignSubmissionStats } from "@/lib/submissionsFirestore";

function useCampaignBrief(docId: string, campaign: FirestoreCampaign | null) {
  const [brief, setBrief] = useState<CampaignBrief | null>(null);

  useEffect(() => {
    if (!docId || !isFirebaseConfigured()) {
      setBrief(null);
      return;
    }

    const firebase = getFirebase();
    if (!firebase) return;

    const ref = doc(firebase.db, "campaigns", docId);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setBrief(null);
        return;
      }
      const parsed = parseCampaignBrief(snap.data());
      parsed.deadline =
        campaign?.deadline && typeof campaign.deadline === "object" && "getTime" in campaign.deadline
          ? (campaign.deadline as Date)
          : campaign?.deadline
            ? new Date(campaign.deadline)
            : null;
      setBrief(parsed);
    });

    return () => unsub();
  }, [docId, campaign?.deadline]);

  return brief;
}

export default function CampaignDetailScreen() {
  const { id, view } = useLocalSearchParams<{ id: string; view?: string }>();
  const { role, authUid, authEmail } = useAuth();
  const docId = typeof id === "string" ? id : "";

  const { campaign, loading, error } = useFirestoreCampaign(docId);
  const brief = useCampaignBrief(docId, campaign);
  const { submissions } = useFirestoreOwnerSubmissions(docId);

  useEffect(() => {
    if (!docId || !campaign) return;
    const creatorView = shouldShowCreatorCampaignView(role, authUid, authEmail, campaign, view);
    if (creatorView) {
      void markCreatorCampaignViewed(docId);
    }
    if (__DEV__) {
      console.log("[BrandOps nav] CampaignDetailScreen", docId, creatorView ? "creator-task" : "brand-dashboard");
    }
  }, [docId, campaign, role, authUid, authEmail, view]);

  const stats = useMemo(() => {
    if (!campaign) return null;
    return computeCampaignSubmissionStats(submissions, campaign.payoutPerVideo ?? 0);
  }, [campaign, submissions]);

  if (!isFirebaseConfigured()) {
    return (
      <BrandOpsScreen scroll>
        <ApiError message="Firebase is not configured." />
      </BrandOpsScreen>
    );
  }

  if (loading && !campaign) {
    return (
      <BrandOpsScreen scroll>
        <ApiLoading label="Loading campaign…" />
      </BrandOpsScreen>
    );
  }

  if (error || !campaign) {
    return (
      <BrandOpsScreen scroll>
        <H1>Campaign</H1>
        <ApiError message={error ?? "Campaign not found in Firestore."} />
      </BrandOpsScreen>
    );
  }

  const resolvedBrief = brief ?? parseCampaignBrief({});
  const resolvedStats = stats ?? computeCampaignSubmissionStats(submissions, campaign.payoutPerVideo ?? 0);

  const deadlineDate =
    campaign.deadline && typeof campaign.deadline === "object" && "getTime" in campaign.deadline
      ? (campaign.deadline as Date)
      : campaign.deadline
        ? new Date(campaign.deadline)
        : null;

  const showCreatorView = shouldShowCreatorCampaignView(role, authUid, authEmail, campaign, view);

  return (
    <>
      <Stack.Screen options={{ title: showCreatorView ? "Your task" : "Campaign" }} />
      <BrandOpsScreen scroll>
        {showCreatorView ? (
          <CreatorCampaignView campaign={campaign} brief={resolvedBrief} deadline={deadlineDate} />
        ) : (
          <BrandCampaignDashboard
            campaign={campaign}
            brief={resolvedBrief}
            stats={resolvedStats}
            submissions={submissions}
            deadline={deadlineDate}
          />
        )}
      </BrandOpsScreen>
    </>
  );
}
