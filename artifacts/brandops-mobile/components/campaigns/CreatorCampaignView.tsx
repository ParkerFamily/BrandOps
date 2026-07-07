import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { BrandOpsCard } from "@/components/ui/BrandOpsCard";
import { BrandOpsButton } from "@/components/ui/BrandOpsButton";
import { P } from "@/components/ui/BrandOpsText";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import type { CampaignBrief } from "@/lib/campaignBrief";
import type { FirestoreCampaign } from "@/lib/campaignsFirestore";
import { buildCreatorTaskMeta } from "@/lib/quickCampaignBrief";
import { buildCreatorBriefDocument } from "@/lib/creatorBriefContent";
import {
  analyzeDraftWithCoach,
  loadCreatorCampaignAi,
  type CreatorCampaignAi,
  type CreatorReviewCoach,
} from "@/lib/creatorBriefAi";
import { buildCreatorPaymentStatus } from "@/lib/creatorPaymentStatus";
import { useCreatorPayoutSetup } from "@/lib/creatorPayoutSetup";
import { isCampaignOwner } from "@/lib/campaignDetailView";
import { isOperatorRole } from "@/lib/roleExperience";
import { useFirestoreMySubmissions } from "@/lib/useFirestoreOwnerSubmissions";
import { CreatorSubmissionSection } from "@/components/campaigns/CreatorSubmissionSection";
import { CreatorBriefDocument } from "@/components/campaigns/CreatorBriefDocument";
import { CreatorFullBriefSheet } from "@/components/campaigns/CreatorFullBriefSheet";
import { CreatorCampaignSpecsCard } from "@/components/campaigns/CreatorCampaignSpecsCard";
import { CreatorStripeSetupBanner } from "@/components/creator/CreatorStripeSetupBanner";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  campaign: FirestoreCampaign;
  brief: CampaignBrief;
  deadline: Date | null;
};

function StatChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 96,
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 14,
        backgroundColor: BrandOpsTheme.colors.surface,
        gap: 4,
      }}
    >
      <Ionicons name={icon} size={16} color={BrandOpsTheme.colors.lime} />
      <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "800", fontSize: 13, lineHeight: 17 }}>{label}</Text>
    </View>
  );
}

export function CreatorCampaignView({ campaign, brief, deadline }: Props) {
  const router = useRouter();
  const { role, authUid, authEmail } = useAuth();
  const payoutSetup = useCreatorPayoutSetup(authUid);
  const meta = buildCreatorTaskMeta(campaign, brief, deadline);
  const { submissions, loading: subsLoading } = useFirestoreMySubmissions();

  const [ai, setAi] = useState<CreatorCampaignAi | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [briefOpen, setBriefOpen] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coach, setCoach] = useState<CreatorReviewCoach | null>(null);
  const [draftUrl, setDraftUrl] = useState<string | null>(null);

  const payment = useMemo(
    () => buildCreatorPaymentStatus(submissions, campaign.firestoreDocId, meta.payout),
    [submissions, campaign.firestoreDocId, meta.payout]
  );

  const briefDoc = useMemo(
    () => buildCreatorBriefDocument(campaign, brief, deadline, ai),
    [campaign, brief, deadline, ai]
  );

  useEffect(() => {
    let cancelled = false;
    setAiLoading(true);
    void loadCreatorCampaignAi(campaign, brief, deadline).then((result) => {
      if (!cancelled) {
        setAi(result);
        setAiLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [campaign.firestoreDocId, brief, deadline]);

  const runCoach = async () => {
    if (!draftUrl) {
      Toast.show({ type: "info", text1: "Add a draft first", text2: "Select a video to preview first." });
      return;
    }
    try {
      setCoachLoading(true);
      const result = await analyzeDraftWithCoach(campaign, brief, { videoUrl: draftUrl });
      setCoach(result);
      setCoachOpen(true);
    } finally {
      setCoachLoading(false);
    }
  };

  const showBrandCompanion =
    isOperatorRole(role) && isCampaignOwner(campaign, authUid, authEmail);

  return (
    <>
      {showBrandCompanion ? (
        <BrandOpsButton
          label="Campaign dashboard"
          variant="ghost"
          onPress={() => router.push(`/campaign/${campaign.firestoreDocId}?view=brand` as never)}
        />
      ) : null}

      <CreatorStripeSetupBanner setup={payoutSetup} compact />

      <BrandOpsCard variant="elevated" style={{ marginBottom: 16, gap: 14, marginTop: showBrandCompanion ? 8 : 0 }}>
        <View>
          <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 24, lineHeight: 30 }}>
            {meta.title}
          </Text>
          <View
            style={{
              alignSelf: "flex-start",
              marginTop: 10,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: BrandOpsTheme.colors.limeSoft,
            }}
          >
            <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "800", fontSize: 11, letterSpacing: 0.6 }}>
              {meta.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <StatChip icon="cash-outline" label={`Earn $${meta.payout}`} />
          {meta.deadlineLong ? <StatChip icon="calendar-outline" label={`Due ${meta.deadlineLong}`} /> : null}
          <StatChip icon="videocam-outline" label={meta.videosNeeded} />
        </View>
      </BrandOpsCard>

      <CreatorCampaignSpecsCard
        campaign={campaign}
        brief={brief}
        deadline={deadline}
        brandName={campaign.ownerEmail?.split("@")[0] ?? null}
      />

      <BrandOpsCard
        variant="elevated"
        style={{
          marginBottom: 16,
          gap: 12,
          borderWidth: 1,
          borderColor: "rgba(198,255,0,0.45)",
          backgroundColor: BrandOpsTheme.colors.limeSoft,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: "rgba(198,255,0,0.22)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="videocam" size={26} color={BrandOpsTheme.colors.lime} />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "800", fontSize: 12, letterSpacing: 0.6 }}>
              STEP 1 — RECORD OR UPLOAD
            </Text>
            <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 18, lineHeight: 24 }}>
              Film a new video or pick one from your phone
            </Text>
            <P style={{ fontSize: 13, lineHeight: 20, color: BrandOpsTheme.colors.muted }}>
              Use the buttons below, then tap Submit when you are ready. You can also use the Upload tab anytime.
            </P>
          </View>
        </View>
        <CreatorSubmissionSection
          campaignDocId={campaign.firestoreDocId}
          campaignTitle={campaign.title}
          payoutAmount={meta.payout}
          canSubmit={meta.canSubmit}
          onDraftReady={(draft) => setDraftUrl(draft.videoUrl)}
          onSubmitted={() => setCoach(null)}
        />
        <BrandOpsButton
          label="Open Upload tab"
          variant="ghost"
          onPress={() => router.push("/(tabs)/upload" as never)}
        />
      </BrandOpsCard>

      {!aiLoading ? (
        <CreatorBriefDocument doc={briefDoc} showMeta={false} />
      ) : (
        <BrandOpsCard variant="soft" style={{ marginBottom: 16, paddingVertical: 24 }}>
          <ActivityIndicator color={BrandOpsTheme.colors.lime} />
        </BrandOpsCard>
      )}

      <BrandOpsButton label="View full brief" variant="secondary" onPress={() => setBriefOpen(true)} />

      {payment.hasSubmission && !subsLoading ? (
        <BrandOpsCard variant="soft" style={{ marginBottom: 12, gap: 6 }}>
          <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "800", fontSize: 13 }}>Your payout</Text>
          <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "800", fontSize: 16 }}>
            ${payment.expectedPayout} · {payment.approvalLabel}
          </Text>
          <P style={{ color: BrandOpsTheme.colors.muted, fontSize: 13 }}>{payment.paymentLabel}</P>
        </BrandOpsCard>
      ) : null}

      <BrandOpsCard variant="soft" style={{ marginBottom: 12 }}>
        <Pressable onPress={() => setCoachOpen((v) => !v)} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "800", fontSize: 15 }}>AI review coach</Text>
            <P style={{ marginTop: 4, fontSize: 13 }}>
              {draftUrl ? "Optional — analyze your draft before submitting." : "Select a video to unlock coaching."}
            </P>
          </View>
          <Ionicons name={coachOpen ? "chevron-up" : "chevron-down"} size={20} color={BrandOpsTheme.colors.subtle} />
        </Pressable>

        {coachOpen ? (
          <View style={{ marginTop: 14, gap: 12 }}>
            <BrandOpsButton
              label={coach ? "Re-analyze draft" : "Analyze my draft"}
              variant="secondary"
              loading={coachLoading}
              disabled={!draftUrl}
              onPress={() => void runCoach()}
            />
            {coach ? (
              <View style={{ gap: 10 }}>
                <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "900", fontSize: 32 }}>
                  {coach.approvalLikelihood}%
                </Text>
                <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 12 }}>Estimated approval likelihood</Text>
                <P style={{ lineHeight: 22 }}>{coach.summary}</P>
                {coach.strengths.map((s) => (
                  <P key={s} style={{ color: BrandOpsTheme.colors.muted }}>
                    + {s}
                  </P>
                ))}
                {coach.improvements.map((s) => (
                  <P key={s}>• {s}</P>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </BrandOpsCard>

      <CreatorFullBriefSheet visible={briefOpen} onClose={() => setBriefOpen(false)} doc={briefDoc} />
    </>
  );
}
