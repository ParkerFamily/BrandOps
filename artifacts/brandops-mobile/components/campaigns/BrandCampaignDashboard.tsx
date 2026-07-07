import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BrandOpsCard } from "@/components/ui/BrandOpsCard";
import { BrandOpsButton } from "@/components/ui/BrandOpsButton";
import { H1, P, Label } from "@/components/ui/BrandOpsText";
import { ApiEmpty } from "@/components/ui/ApiState";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import type { CampaignBrief } from "@/lib/campaignBrief";
import type { FirestoreCampaign } from "@/lib/campaignsFirestore";
import {
  countReviewableSubmissions,
  type CampaignSubmissionStats,
  type FirestoreSubmission,
} from "@/lib/submissionsFirestore";
import { useAuth } from "@/contexts/AuthContext";
import { canReviewSubmissions } from "@/lib/roleExperience";
import { CampaignAiBriefCard } from "@/components/campaigns/CampaignAiBriefCard";
import { CreatorFullBriefSheet } from "@/components/campaigns/CreatorFullBriefSheet";
import { loadBrandCampaignAi, loadCreatorCampaignAi, type BrandCampaignAi } from "@/lib/creatorBriefAi";
import { buildCreatorBriefDocument } from "@/lib/creatorBriefContent";

type Props = {
  campaign: FirestoreCampaign;
  brief: CampaignBrief;
  stats: CampaignSubmissionStats;
  submissions: FirestoreSubmission[];
  deadline: Date | null;
};

function StatusBadge({ status }: { status: FirestoreCampaign["status"] }) {
  const color =
    status === "active"
      ? BrandOpsTheme.colors.lime
      : status === "draft"
        ? BrandOpsTheme.colors.subtle
        : BrandOpsTheme.colors.muted;
  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.06)",
      }}
    >
      <Text style={{ color, fontWeight: "800", fontSize: 11, textTransform: "uppercase" }}>{status}</Text>
    </View>
  );
}

function DashMetric({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: "46%",
        backgroundColor: highlight ? BrandOpsTheme.colors.limeSoft : BrandOpsTheme.colors.surface,
        borderRadius: 16,
        padding: 14,
        borderWidth: highlight ? 1 : 0,
        borderColor: highlight ? "rgba(198,255,0,0.35)" : "transparent",
      }}
    >
      <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 11, fontWeight: "700" }}>{label}</Text>
      <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 22, marginTop: 6 }}>{value}</Text>
      {sub ? (
        <Text style={{ color: BrandOpsTheme.colors.muted, fontSize: 12, marginTop: 4 }}>{sub}</Text>
      ) : null}
    </View>
  );
}

export function BrandCampaignDashboard({
  campaign,
  brief,
  stats,
  submissions,
  deadline,
}: Props) {
  const router = useRouter();
  const { authUid, role } = useAuth();
  const canReview = canReviewSubmissions(role);
  const [briefOpen, setBriefOpen] = useState(false);
  const [aiBrief, setAiBrief] = useState<BrandCampaignAi | null>(null);
  const [creatorAi, setCreatorAi] = useState<Awaited<ReturnType<typeof loadCreatorCampaignAi>> | null>(null);
  const [aiLoading, setAiLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setAiLoading(true);
    void Promise.all([
      loadBrandCampaignAi(campaign, brief, deadline),
      loadCreatorCampaignAi(campaign, brief, deadline),
    ]).then(([brand, creator]) => {
      if (!cancelled) {
        setAiBrief(brand);
        setCreatorAi(creator);
        setAiLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [campaign.firestoreDocId, brief, deadline]);

  const creatorBriefDoc = useMemo(
    () => buildCreatorBriefDocument(campaign, brief, deadline, creatorAi),
    [campaign, brief, deadline, creatorAi]
  );

  const budgetTotal = campaign.totalBudget ?? 0;
  const budgetUsed = stats.budgetUsed ?? campaign.totalSpent ?? 0;
  const needsReview = canReview ? countReviewableSubmissions(submissions, authUid) : 0;
  const creators = stats.assignedCreators ?? campaign.creatorCount ?? 0;
  const totalSubmissions = stats.total ?? 0;

  return (
    <>
      <Pressable
        onPress={() => router.push(`/campaign/${campaign.firestoreDocId}?view=creator` as never)}
        style={({ pressed }) => ({
          marginBottom: 16,
          opacity: pressed ? 0.92 : 1,
          borderRadius: BrandOpsTheme.radius.xl,
          borderWidth: 1,
          borderColor: "rgba(198,255,0,0.45)",
          backgroundColor: BrandOpsTheme.colors.limeSoft,
          padding: 16,
          gap: 10,
        })}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: "rgba(198,255,0,0.2)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="videocam" size={24} color={BrandOpsTheme.colors.lime} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "800", fontSize: 12, letterSpacing: 0.6 }}>
              CREATOR VIEW
            </Text>
            <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 17, lineHeight: 22 }}>
              See where creators record & upload
            </Text>
            <Text style={{ color: BrandOpsTheme.colors.muted, fontSize: 13, lineHeight: 19 }}>
              Opens the same screen creators use to film or pick a video, then submit for review.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={BrandOpsTheme.colors.lime} />
        </View>
      </Pressable>

      <View style={{ marginTop: 4, marginBottom: 16 }}>
        <Label style={{ color: BrandOpsTheme.colors.lime }}>Campaign dashboard</Label>
        <H1 style={{ marginTop: 6, marginBottom: 10 }}>{campaign.title}</H1>
        <StatusBadge status={campaign.status} />
      </View>

      <CampaignAiBriefCard
        summary={aiBrief?.summary ?? "Loading campaign brief…"}
        bullets={aiBrief?.highlights ?? []}
        loading={aiLoading}
        source={aiBrief?.source}
        onViewFull={() => setBriefOpen(true)}
        viewFullLabel="View full brief"
      />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <DashMetric
          label="Budget"
          value={`$${budgetUsed.toLocaleString()}`}
          sub={`of $${budgetTotal.toLocaleString()} spent`}
        />
        <DashMetric label="Creators" value={String(creators)} sub={creators === 1 ? "assigned" : "assigned"} />
        <DashMetric label="Submissions" value={String(totalSubmissions)} sub="total received" />
        <DashMetric
          label="Approvals"
          value={String(needsReview)}
          sub={needsReview === 1 ? "needs review" : "need review"}
          highlight={needsReview > 0}
        />
      </View>

      {totalSubmissions === 0 ? (
        <BrandOpsCard variant="soft" style={{ marginBottom: 14 }}>
          <ApiEmpty title="No submissions yet" body="Creators will show up here once UGC starts coming in." />
        </BrandOpsCard>
      ) : null}

      <BrandOpsCard variant="elevated" style={{ marginBottom: 14, gap: 10 }}>
        <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 16 }}>Quick actions</Text>
        {canReview ? (
          <BrandOpsButton
            label={
              needsReview > 0
                ? `Review ${needsReview} submission${needsReview === 1 ? "" : "s"}`
                : "Review submissions"
            }
            disabled={needsReview === 0}
            onPress={() => router.push("/(tabs)/upload" as never)}
          />
        ) : null}
        <BrandOpsButton label="Open messages" variant="secondary" onPress={() => router.push("/(tabs)/messages" as never)} />
        <BrandOpsButton
          label="View creators on web"
          variant="secondary"
          onPress={() => router.push("/(tabs)/upload" as never)}
        />
        <BrandOpsButton label="Preview creator brief" variant="ghost" onPress={() => setBriefOpen(true)} />
      </BrandOpsCard>

      <P style={{ color: BrandOpsTheme.colors.subtle, fontSize: 12, textAlign: "center", marginBottom: 8 }}>
        Full campaign editing → brandopsapp.com
      </P>

      <CreatorFullBriefSheet
        visible={briefOpen}
        onClose={() => setBriefOpen(false)}
        doc={creatorBriefDoc}
        title="Creator brief"
      />
    </>
  );
}
