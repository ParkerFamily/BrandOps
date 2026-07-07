import { Pressable, ScrollView, Text, View } from "react-native";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import type {
  CampaignNicheFilter,
  CampaignTypeFilter,
  MinPayoutFilter,
  PlatformFilter,
} from "@/lib/campaignFilters";

type Chip = { id: string; label: string };

type Props = {
  platform: PlatformFilter;
  type: CampaignTypeFilter;
  niche: CampaignNicheFilter;
  minPayout: MinPayoutFilter;
  remoteOnly: boolean;
  onPlatformChange: (v: PlatformFilter) => void;
  onTypeChange: (v: CampaignTypeFilter) => void;
  onNicheChange: (v: CampaignNicheFilter) => void;
  onMinPayoutChange: (v: MinPayoutFilter) => void;
  onRemoteOnlyChange: (v: boolean) => void;
};

function ChipRow({
  chips,
  active,
  onSelect,
}: {
  chips: Chip[];
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
      {chips.map((chip) => {
        const selected = chip.id === active;
        return (
          <Pressable
            key={chip.id}
            onPress={() => onSelect(chip.id)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: selected ? BrandOpsTheme.colors.limeSoft : BrandOpsTheme.colors.surface,
              borderWidth: 1,
              borderColor: selected ? "rgba(198,255,0,0.35)" : BrandOpsTheme.colors.border,
            }}
          >
            <Text style={{ color: selected ? BrandOpsTheme.colors.lime : BrandOpsTheme.colors.muted, fontWeight: "800", fontSize: 12 }}>
              {chip.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function CampaignFilterBar({
  platform,
  type,
  niche,
  minPayout,
  remoteOnly,
  onPlatformChange,
  onTypeChange,
  onNicheChange,
  onMinPayoutChange,
  onRemoteOnlyChange,
}: Props) {
  return (
    <View style={{ gap: 6, marginBottom: 12 }}>
      <Text style={{ color: BrandOpsTheme.colors.subtle, fontWeight: "800", fontSize: 11, letterSpacing: 0.6 }}>FILTERS</Text>
      <ChipRow
        chips={[
          { id: "all", label: "All types" },
          { id: "ugc", label: "UGC" },
          { id: "influencer", label: "Influencer" },
        ]}
        active={type}
        onSelect={(id) => onTypeChange(id as CampaignTypeFilter)}
      />
      <ChipRow
        chips={[
          { id: "all", label: "All niches" },
          { id: "beauty", label: "Beauty" },
          { id: "tech", label: "Tech" },
          { id: "food", label: "Food" },
          { id: "fashion", label: "Fashion" },
        ]}
        active={niche}
        onSelect={(id) => onNicheChange(id as CampaignNicheFilter)}
      />
      <ChipRow
        chips={[
          { id: "all", label: "Any payout" },
          { id: "50", label: "$50+" },
          { id: "100", label: "$100+" },
          { id: "200", label: "$200+" },
        ]}
        active={minPayout}
        onSelect={(id) => onMinPayoutChange(id as MinPayoutFilter)}
      />
      <ChipRow
        chips={[
          { id: "all", label: "All platforms" },
          { id: "tiktok", label: "TikTok" },
          { id: "instagram", label: "Instagram" },
          { id: "youtube", label: "YouTube" },
        ]}
        active={platform}
        onSelect={(id) => onPlatformChange(id as PlatformFilter)}
      />
      <Pressable
        onPress={() => onRemoteOnlyChange(!remoteOnly)}
        style={{
          alignSelf: "flex-start",
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 999,
          backgroundColor: remoteOnly ? BrandOpsTheme.colors.limeSoft : BrandOpsTheme.colors.surface,
          borderWidth: 1,
          borderColor: remoteOnly ? "rgba(198,255,0,0.35)" : BrandOpsTheme.colors.border,
        }}
      >
        <Text style={{ color: remoteOnly ? BrandOpsTheme.colors.lime : BrandOpsTheme.colors.muted, fontWeight: "800", fontSize: 12 }}>
          Remote only
        </Text>
      </Pressable>
    </View>
  );
}
