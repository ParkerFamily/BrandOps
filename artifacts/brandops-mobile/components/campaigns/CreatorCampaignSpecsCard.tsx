import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BrandOpsCard } from "@/components/ui/BrandOpsCard";
import { P, Label } from "@/components/ui/BrandOpsText";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import type { CampaignBrief } from "@/lib/campaignBrief";
import type { FirestoreCampaign } from "@/lib/campaignsFirestore";

type Props = {
  campaign: FirestoreCampaign;
  brief: CampaignBrief;
  deadline: Date | null;
  brandName?: string | null;
};

function SpecRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
      <Ionicons name={icon} size={16} color={BrandOpsTheme.colors.lime} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 11, fontWeight: "800" }}>{label}</Text>
        <Text style={{ color: BrandOpsTheme.colors.text, fontSize: 14, fontWeight: "700", marginTop: 2, lineHeight: 20 }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export function CreatorCampaignSpecsCard({ campaign, brief, deadline, brandName }: Props) {
  const deliverables =
    brief.deliverables.length > 0
      ? brief.deliverables.slice(0, 3).join(" · ")
      : `${brief.contentType} · ${brief.platform}`;
  const script =
    brief.creatorBrief.trim() ||
    brief.description.trim() ||
    "Follow the campaign brief and hook in the first 3 seconds.";
  const usage = brief.usageRights?.trim() || "Organic social use unless stated in the full brief.";
  const deadlineLabel = deadline
    ? deadline.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "Flexible — submit when ready";

  return (
    <BrandOpsCard variant="soft" style={{ marginBottom: 16, gap: 14 }}>
      <Label style={{ color: BrandOpsTheme.colors.lime }}>Campaign details</Label>
      <SpecRow icon="business-outline" label="Brand" value={brandName?.trim() || campaign.ownerEmail?.split("@")[0] || "Brand partner"} />
      <SpecRow icon="cash-outline" label="Payout" value={`$${campaign.payoutPerVideo ?? brief.payoutPerVideo} per approved video`} />
      <SpecRow icon="calendar-outline" label="Deadline" value={deadlineLabel} />
      <SpecRow icon="clipboard-outline" label="Deliverables" value={deliverables} />
      <SpecRow icon="document-text-outline" label="Script / requirements" value={script.slice(0, 160) + (script.length > 160 ? "…" : "")} />
      <SpecRow icon="shield-checkmark-outline" label="Usage rights" value={usage} />
      <SpecRow icon="time-outline" label="Approval timeline" value="Usually 24–72 hours after submit" />
      {brief.approvalCriteria.length > 0 ? (
        <View style={{ gap: 6 }}>
          <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 11, fontWeight: "800" }}>APPROVAL CRITERIA</Text>
          {brief.approvalCriteria.slice(0, 4).map((c) => (
            <P key={c} style={{ fontSize: 13, color: BrandOpsTheme.colors.muted }}>
              • {c}
            </P>
          ))}
        </View>
      ) : null}
    </BrandOpsCard>
  );
}
