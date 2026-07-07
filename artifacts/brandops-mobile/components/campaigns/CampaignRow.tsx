import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { CampaignThumb } from "@/components/ui/CampaignThumb";
import type { Campaign } from "@workspace/api-client-react";
import { campaignDetailPath, type FirestoreCampaign } from "@/lib/campaignsFirestore";

type CampaignLike = Campaign & { firestoreDocId?: string };

function statusColor(status: Campaign["status"]) {
  if (status === "active") return BrandOpsTheme.colors.lime;
  if (status === "draft") return BrandOpsTheme.colors.subtle;
  if (status === "paused") return BrandOpsTheme.colors.warning ?? "#F59E0B";
  return BrandOpsTheme.colors.muted;
}

export function CampaignRow({ campaign, href }: { campaign: CampaignLike; href?: string }) {
  const router = useRouter();
  const pending = campaign.pendingCount ?? 0;
  const approved = campaign.approvedCount ?? 0;
  const total = pending + approved;
  const progress = total > 0 ? approved / total : 0;
  const spentPct = campaign.totalBudget ? (campaign.totalSpent ?? 0) / campaign.totalBudget : 0;
  const link = href ?? campaignDetailPath(campaign as FirestoreCampaign);
  const deadline =
    campaign.deadline && typeof campaign.deadline === "object" && "getTime" in campaign.deadline
      ? (campaign.deadline as Date)
      : campaign.deadline
        ? new Date(campaign.deadline)
        : null;

  const openDetail = () => {
    if (__DEV__) {
      console.log("[BrandOps nav] campaign tap", campaign.firestoreDocId ?? campaign.id, "→", link);
    }
    router.push(link as never);
  };

  return (
    <Pressable onPress={openDetail}>
      {({ pressed }) => (
        <View
          style={{
            flexDirection: "row",
            gap: 14,
            paddingVertical: 14,
            opacity: pressed ? 0.9 : 1,
          }}
        >
          <CampaignThumb />

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 16, flex: 1 }} numberOfLines={1}>
                {campaign.title}
              </Text>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 8,
                  marginLeft: 8,
                  backgroundColor: "rgba(255,255,255,0.06)",
                }}
              >
                <Text style={{ color: statusColor(campaign.status), fontWeight: "800", fontSize: 10, textTransform: "uppercase" }}>
                  {campaign.status}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
              <MetaChip label={`$${(campaign.totalBudget ?? 0).toLocaleString()} budget`} />
              <MetaChip label={`$${(campaign.totalSpent ?? 0).toLocaleString()} used`} />
              {pending > 0 ? <MetaChip label={`${pending} pending`} highlight /> : null}
              {approved > 0 ? <MetaChip label={`${approved} approved`} /> : null}
            </View>

            {deadline && !Number.isNaN(deadline.getTime()) ? (
              <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 12, marginTop: 6 }}>
                Due {deadline.toLocaleDateString()}
              </Text>
            ) : null}

            <View style={{ marginTop: 10, gap: 6 }}>
              <Bar label="Approvals" pct={progress} />
              <Bar label="Budget used" pct={spentPct} muted />
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
              <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 12, fontWeight: "700" }}>
                {campaign.creatorCount ?? 0} creators
              </Text>
              <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 12, fontWeight: "700" }}>
                ${campaign.payoutPerVideo ?? 0} / video
              </Text>
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
}

function MetaChip({ label, highlight }: { label: string; highlight?: boolean }) {
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        backgroundColor: highlight ? BrandOpsTheme.colors.limeSoft : "rgba(255,255,255,0.05)",
      }}
    >
      <Text
        style={{
          color: highlight ? BrandOpsTheme.colors.lime : BrandOpsTheme.colors.subtle,
          fontWeight: "700",
          fontSize: 11,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function Bar({ label, pct, muted }: { label: string; pct: number; muted?: boolean }) {
  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 10, fontWeight: "700" }}>{label}</Text>
        <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 10 }}>{Math.round(pct * 100)}%</Text>
      </View>
      <View style={{ height: 4, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <View
          style={{
            height: 4,
            width: `${Math.min(100, pct * 100)}%`,
            backgroundColor: muted ? "rgba(255,255,255,0.25)" : BrandOpsTheme.colors.lime,
            borderRadius: 4,
          }}
        />
      </View>
    </View>
  );
}
