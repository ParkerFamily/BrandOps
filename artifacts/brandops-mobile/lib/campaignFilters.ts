import type { FirestoreCampaign } from "@/lib/campaignsFirestore";

export type CampaignTypeFilter = "all" | "ugc" | "influencer";
export type CampaignNicheFilter = "all" | "beauty" | "tech" | "food" | "fashion";
export type MinPayoutFilter = "all" | "50" | "100" | "200";
export type PlatformFilter = "all" | "tiktok" | "instagram" | "youtube";

export type CampaignFilterState = {
  query: string;
  platform: PlatformFilter;
  type: CampaignTypeFilter;
  niche: CampaignNicheFilter;
  minPayout: MinPayoutFilter;
  remoteOnly: boolean;
};

export const DEFAULT_CAMPAIGN_FILTERS: CampaignFilterState = {
  query: "",
  platform: "all",
  type: "all",
  niche: "all",
  minPayout: "all",
  remoteOnly: false,
};

function haystack(c: FirestoreCampaign): string {
  return `${c.title} ${c.description} ${c.niche} ${c.platform}`.toLowerCase();
}

function inferType(c: FirestoreCampaign): "ugc" | "influencer" {
  const text = haystack(c);
  if (text.includes("influencer") || text.includes("whitelisting") || text.includes("paid ad")) {
    return "influencer";
  }
  return "ugc";
}

function matchesNiche(c: FirestoreCampaign, niche: CampaignNicheFilter): boolean {
  if (niche === "all") return true;
  const text = haystack(c);
  if (niche === "beauty") return /beauty|skincare|makeup|cosmetic/.test(text);
  if (niche === "tech") return /tech|app|software|saas|gadget|ai\b/.test(text);
  if (niche === "food") return /food|restaurant|recipe|drink|snack/.test(text);
  if (niche === "fashion") return /fashion|style|clothing|apparel|wear/.test(text);
  return true;
}

export function filterCreatorCampaigns(
  campaigns: FirestoreCampaign[],
  filters: CampaignFilterState
): FirestoreCampaign[] {
  const q = filters.query.trim().toLowerCase();
  const minPayout = filters.minPayout === "all" ? 0 : Number(filters.minPayout);

  return campaigns.filter((c) => {
    if (filters.platform !== "all" && c.platform !== filters.platform) return false;
    if (filters.type !== "all" && inferType(c) !== filters.type) return false;
    if (!matchesNiche(c, filters.niche)) return false;
    if (minPayout > 0 && (c.payoutPerVideo ?? 0) < minPayout) return false;
    if (filters.remoteOnly) {
      const text = haystack(c);
      if (/on-site|in person|in-person|local only|on location/.test(text)) return false;
    }
    if (q && !haystack(c).includes(q)) return false;
    return true;
  });
}
