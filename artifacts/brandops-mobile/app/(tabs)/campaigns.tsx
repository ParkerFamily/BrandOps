import { useMemo, useState } from "react";
import { Pressable, RefreshControl, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { BrandOpsScreen } from "@/components/ui/BrandOpsScreen";
import { BrandOpsCard } from "@/components/ui/BrandOpsCard";
import { H1, P, Label } from "@/components/ui/BrandOpsText";
import { ApiEmpty, ApiError, ApiLoading } from "@/components/ui/ApiState";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { CampaignRow } from "@/components/campaigns/CampaignRow";
import { useAuth } from "@/contexts/AuthContext";
import { useCreatorPayoutSetup } from "@/lib/creatorPayoutSetup";
import { CreatorStripeSetupBanner } from "@/components/creator/CreatorStripeSetupBanner";
import { campaignDetailPath, useFirestoreCampaigns } from "@/lib/campaignsFirestore";
import { enrichCampaignWithSubmissions } from "@/lib/brandWorkspaceMetrics";
import { useFirestoreOwnerSubmissions } from "@/lib/useFirestoreOwnerSubmissions";
import { canReviewSubmissions } from "@/lib/roleExperience";
import { isFirebaseConfigured } from "@/lib/env";
import { useFirestoreMySubmissions } from "@/lib/useFirestoreOwnerSubmissions";
import {
  creatorCampaignBadge,
  latestSubmissionByCampaign,
  useCreatorActivityState,
} from "@/lib/creatorActivityStorage";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CampaignFilterBar } from "@/components/campaigns/CampaignFilterBar";
import { filterCreatorCampaigns, type CampaignFilterState, DEFAULT_CAMPAIGN_FILTERS } from "@/lib/campaignFilters";
import { usePullToRefresh } from "@/lib/usePullToRefresh";

export default function CampaignsScreen() {
  const { role } = useAuth();
  if (!canReviewSubmissions(role)) return <CreatorBrowse />;
  return <BrandCampaigns />;
}

function BrandCampaigns() {
  const [query, setQuery] = useState("");
  const { authUid, loading: authLoading } = useAuth();
  const { campaigns, loading, error, refetch, syncDiagnostics } = useFirestoreCampaigns({ ownerOnly: true });
  const { submissions } = useFirestoreOwnerSubmissions();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return campaigns
      .filter((c) => !q || `${c.title} ${c.niche}`.toLowerCase().includes(q))
      .sort((a, b) => {
        const rank = (s: string) => (s === "active" ? 0 : s === "draft" ? 1 : 2);
        return rank(a.status) - rank(b.status) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [campaigns, query]);

  const enriched = useMemo(
    () => filtered.map((campaign) => enrichCampaignWithSubmissions(campaign, submissions)),
    [filtered, submissions]
  );

  if (!isFirebaseConfigured()) {
    return (
      <BrandOpsScreen scroll>
        <ApiError message="Firebase is not configured." />
      </BrandOpsScreen>
    );
  }

  if (authLoading && !authUid) {
    return (
      <BrandOpsScreen scroll>
        <ApiLoading label="Loading campaigns…" />
      </BrandOpsScreen>
    );
  }

  if (!authUid) {
    return (
      <BrandOpsScreen scroll>
        <ApiEmpty title="Sign in required" body="Sign in to see your campaigns." />
      </BrandOpsScreen>
    );
  }

  return (
    <BrandOpsScreen
      scroll
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={BrandOpsTheme.colors.lime} />
      }
    >
      <H1 style={{ marginBottom: 4 }}>Campaigns</H1>
      <P style={{ marginBottom: 16, color: BrandOpsTheme.colors.muted }}>
        Your campaigns sync in real time from BrandOps.
      </P>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search campaigns…"
        placeholderTextColor={BrandOpsTheme.colors.subtle}
        style={inputStyle}
      />

      {loading && campaigns.length === 0 ? <ApiLoading /> : null}
      {error ? <ApiError message={error} onRetry={() => void onRefresh()} /> : null}

      {!loading && !error && filtered.length === 0 ? (
        <ApiEmpty
          title="No campaigns yet"
          body={[
            "Pull down to sync from BrandOps. Use the same account as brandopsapp.com — campaigns created on web appear here after sync.",
            syncDiagnostics
              ? `Sync: indexed ${syncDiagnostics.indexedIds}, linked ${syncDiagnostics.linkedByEmail + syncDiagnostics.linkedOrphans}, loaded ${syncDiagnostics.loadedDocs}. Signed in as ${syncDiagnostics.tokenEmail ?? syncDiagnostics.authEmail ?? "unknown"}.`
              : null,
          ]
            .filter(Boolean)
            .join("\n\n")}
        />
      ) : null}

      <View style={{ marginTop: 20 }}>
        {enriched.map((c, i) => (
          <View key={c.firestoreDocId}>
            {i > 0 ? <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.05)" }} /> : null}
            <CampaignRow campaign={c} href={campaignDetailPath(c)} />
          </View>
        ))}
      </View>
    </BrandOpsScreen>
  );
}

function CreatorBrowse() {
  const router = useRouter();
  const { authUid } = useAuth();
  const payoutSetup = useCreatorPayoutSetup(authUid);
  const { submissions: mySubmissions } = useFirestoreMySubmissions();
  const { viewedCampaignIds, markCampaignViewed } = useCreatorActivityState();
  const [filters, setFilters] = useState<CampaignFilterState>(DEFAULT_CAMPAIGN_FILTERS);
  const { campaigns, loading, error, refetch, syncDiagnostics } = useFirestoreCampaigns({ status: "active" });
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  const submissionByCampaign = useMemo(() => latestSubmissionByCampaign(mySubmissions), [mySubmissions]);

  const filtered = useMemo(() => filterCreatorCampaigns(campaigns, filters), [campaigns, filters]);

  if (!isFirebaseConfigured()) {
    return (
      <BrandOpsScreen scroll>
        <ApiError message="Firebase is required for live campaign sync." />
      </BrandOpsScreen>
    );
  }

  return (
    <BrandOpsScreen
      scroll
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={BrandOpsTheme.colors.lime} />
      }
    >
      <H1 style={{ marginBottom: 4 }}>Open campaigns</H1>
      <P style={{ marginBottom: 14 }}>Apply and submit UGC.</P>

      <CreatorStripeSetupBanner setup={payoutSetup} compact />

      <TextInput
        value={filters.query}
        onChangeText={(query) => setFilters((prev) => ({ ...prev, query }))}
        placeholder="Search niche, payout…"
        placeholderTextColor={BrandOpsTheme.colors.subtle}
        style={inputStyle}
      />

      <CampaignFilterBar
        platform={filters.platform}
        type={filters.type}
        niche={filters.niche}
        minPayout={filters.minPayout}
        remoteOnly={filters.remoteOnly}
        onPlatformChange={(platform) => setFilters((prev) => ({ ...prev, platform }))}
        onTypeChange={(type) => setFilters((prev) => ({ ...prev, type }))}
        onNicheChange={(niche) => setFilters((prev) => ({ ...prev, niche }))}
        onMinPayoutChange={(minPayout) => setFilters((prev) => ({ ...prev, minPayout }))}
        onRemoteOnlyChange={(remoteOnly) => setFilters((prev) => ({ ...prev, remoteOnly }))}
      />

      {loading && campaigns.length === 0 ? <ApiLoading label="Loading campaigns…" /> : null}
      {error ? <ApiError message={error} /> : null}

      {!loading && !error && campaigns.length === 0 ? (
        <ApiEmpty
          title="No campaigns available yet"
          body="New brand briefs show up here when they go live. Enable notifications in Settings so you never miss one."
        />
      ) : null}

      {!loading && !error && campaigns.length > 0 && filtered.length === 0 ? (
        <ApiEmpty
          title="No campaigns match"
          body="Try clearing filters or search for a different niche or payout."
        />
      ) : null}

      <View style={{ gap: 14 }}>
        {filtered.map((c) => {
          const badge = creatorCampaignBadge({
            campaignDocId: c.firestoreDocId,
            submission: submissionByCampaign.get(c.firestoreDocId) ?? null,
            viewedCampaignIds,
          });

          return (
          <Pressable
            key={c.firestoreDocId}
            onPress={() => {
              void markCampaignViewed(c.firestoreDocId);
              const path = campaignDetailPath(c, { creator: true });
              if (__DEV__) console.log("[BrandOps nav] creator campaign tap", c.firestoreDocId, "→", path);
              router.push(path as never);
            }}
          >
            {({ pressed }) => (
              <BrandOpsCard variant="soft" style={{ opacity: pressed ? 0.9 : 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <Label style={{ color: BrandOpsTheme.colors.lime }}>${c.payoutPerVideo} / approved</Label>
                    {badge ? <StatusBadge label={badge.label} tone={badge.tone} /> : null}
                  </View>
                  <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 17, marginTop: 8 }}>
                    {c.title}
                  </Text>
                  <P style={{ marginTop: 6 }} numberOfLines={2}>
                    {c.description}
                  </P>
                </BrandOpsCard>
            )}
          </Pressable>
          );
        })}
      </View>
    </BrandOpsScreen>
  );
}

const inputStyle = {
  height: 48,
  borderRadius: BrandOpsTheme.radius.lg,
  paddingHorizontal: BrandOpsTheme.spacing.md,
  backgroundColor: BrandOpsTheme.colors.surface,
  color: BrandOpsTheme.colors.text,
  fontSize: 15,
} as const;
