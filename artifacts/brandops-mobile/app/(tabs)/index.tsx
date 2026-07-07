import { useEffect, useState } from "react";
import { Pressable, RefreshControl, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BrandOpsScreen } from "@/components/ui/BrandOpsScreen";
import { BrandOpsCard } from "@/components/ui/BrandOpsCard";
import { Avatar } from "@/components/ui/Avatar";
import { PulseChart } from "@/components/ui/PulseChart";
import { ApiEmpty, ApiError, ApiLoading, ApiNotConfigured } from "@/components/ui/ApiState";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { useAuth } from "@/contexts/AuthContext";
import { getApiAuthHeaders, getApiBaseUrl, isApiConfigured } from "@/lib/apiClient";
import { formatRelativeTime, workspaceLabel } from "@/lib/format";
import { canReviewSubmissions } from "@/lib/roleExperience";
import { useBrandWorkspaceMetrics } from "@/lib/brandWorkspaceMetrics";
import { campaignDetailPath, useFirestoreCampaigns } from "@/lib/campaignsFirestore";
import { CreatorLaunchChecklist } from "@/components/creator/CreatorLaunchChecklist";
import { CreatorDifferentiatorCard } from "@/components/creator/CreatorDifferentiatorCard";
import { CreatorEarningsCard } from "@/components/creator/CreatorEarningsCard";
import { useCreatorPayoutSetup } from "@/lib/creatorPayoutSetup";
import { CreatorStripeSetupBanner } from "@/components/creator/CreatorStripeSetupBanner";
import { isFirebaseConfigured } from "@/lib/env";
import { usePullToRefresh } from "@/lib/usePullToRefresh";
import { useFirestoreMySubmissions } from "@/lib/useFirestoreOwnerSubmissions";
import { useFirestoreCreatorPayments } from "@/lib/useFirestoreCreatorPayments";

export default function HomeScreen() {
  const { role } = useAuth();
  if (!canReviewSubmissions(role)) return <CreatorHome />;
  return <BrandCommandCenter />;
}

function BrandCommandCenter() {
  const router = useRouter();
  const { user, loading: authLoading, authUid, authEmail, role } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const { metrics, loading, error, refetch, campaigns, submissions } = useBrandWorkspaceMetrics();

  const urgent = metrics.pendingReviews[0];
  const approvalCount = metrics.reviewQueueCount;

  useEffect(() => {
    if (!isApiConfigured() || !authUid || campaigns.length === 0) {
      setAiInsight(null);
      return;
    }

    const base = getApiBaseUrl();
    if (!base) return;

    let cancelled = false;
    (async () => {
      try {
        const authHeaders = await getApiAuthHeaders();
        const res = await fetch(`${base}/openai/dashboard-insights`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            activeCampaigns: metrics.activeCampaigns,
            pendingSubmissions: metrics.pendingReview,
            approvedVideos: metrics.approvedVideos,
            totalSpend: metrics.totalSpend,
            budgetUsed: metrics.budgetUsedPercent,
          }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { insights?: { body: string }[] };
        if (!cancelled && data.insights?.[0]?.body) {
          setAiInsight(data.insights[0].body);
        }
      } catch {
        // AI insight is optional
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    authUid,
    campaigns.length,
    metrics.activeCampaigns,
    metrics.approvedVideos,
    metrics.budgetUsedPercent,
    metrics.pendingReview,
    metrics.totalSpend,
  ]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = workspaceLabel(user?.displayName, user?.email);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (!isFirebaseConfigured()) {
    return (
      <BrandOpsScreen scroll glow>
        <ApiNotConfigured />
      </BrandOpsScreen>
    );
  }

  if (authLoading && !authUid) {
    return (
      <BrandOpsScreen scroll glow>
        <ApiLoading label="Loading workspace…" />
      </BrandOpsScreen>
    );
  }

  if (!authUid) {
    return (
      <BrandOpsScreen scroll glow>
        <ApiEmpty title="Sign in required" body="Sign in to see your workspace." />
      </BrandOpsScreen>
    );
  }

  if (error && campaigns.length === 0 && submissions.length === 0) {
    return (
      <BrandOpsScreen scroll glow>
        <ApiError message="Couldn't load your workspace." onRetry={() => void onRefresh()} />
      </BrandOpsScreen>
    );
  }

  const hasWorkspaceActivity =
    approvalCount > 0 ||
    metrics.activeCampaigns > 0 ||
    metrics.recentActivity.length > 0 ||
    metrics.spendThisWeek > 0;

  return (
    <BrandOpsScreen
      scroll
      glow
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={BrandOpsTheme.colors.lime} />}
    >
      <Text style={{ color: BrandOpsTheme.colors.subtle, fontWeight: "700", fontSize: 14 }}>
        {greeting}, {name}
      </Text>
      <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 11, marginTop: 4 }}>
        Brand workspace · {authEmail ?? authUid ?? "signed in"} · role {role ?? "loading"}
      </Text>

      {approvalCount > 0 ? (
        <Pressable onPress={() => router.push("/(tabs)/upload")} style={{ marginTop: 16, marginBottom: 28 }}>
          {({ pressed }) => (
            <View style={{ opacity: pressed ? 0.96 : 1, borderRadius: BrandOpsTheme.radius.xl, overflow: "hidden", ...BrandOpsTheme.shadow.glow }}>
              <LinearGradient
                colors={["rgba(198,255,0,0.22)", "rgba(198,255,0,0.06)", "rgba(255,255,255,0.02)"]}
                style={{ padding: 24, minHeight: 168, justifyContent: "flex-end" }}
              >
                <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "800", fontSize: 13, letterSpacing: 0.5 }}>NEEDS YOU NOW</Text>
                <Text style={{ color: "#fff", fontWeight: "900", fontSize: 40, marginTop: 6, lineHeight: 44 }}>
                  {approvalCount}
                </Text>
                <Text style={{ color: "#fff", fontWeight: "900", fontSize: 22, marginTop: -4 }}>approvals waiting</Text>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 18, gap: 8 }}>
                  <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "900", fontSize: 16 }}>Start reviewing</Text>
                  <Ionicons name="arrow-forward" size={20} color={BrandOpsTheme.colors.lime} />
                </View>
              </LinearGradient>
            </View>
          )}
        </Pressable>
      ) : (
        <View
          style={{
            marginTop: 16,
            marginBottom: 28,
            borderRadius: BrandOpsTheme.radius.xl,
            borderWidth: 1,
            borderColor: BrandOpsTheme.colors.border,
            backgroundColor: BrandOpsTheme.colors.surface,
            padding: 24,
            minHeight: 168,
            justifyContent: "center",
          }}
        >
          <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "800", fontSize: 13, letterSpacing: 0.5 }}>YOUR WORKSPACE</Text>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 24, marginTop: 10, lineHeight: 30 }}>
            {hasWorkspaceActivity ? "You're caught up" : "No activity yet"}
          </Text>
          <Text style={{ color: BrandOpsTheme.colors.muted, fontSize: 14, marginTop: 10, lineHeight: 20 }}>
            {hasWorkspaceActivity
              ? "No submissions waiting for review right now."
              : "Create a campaign on brandopsapp.com — your stats and submissions will show here."}
          </Text>
        </View>
      )}

      {urgent ? (
        <Pressable onPress={() => router.push("/(tabs)/upload")} style={{ marginBottom: 28, paddingVertical: 4 }}>
          <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 11, fontWeight: "800", letterSpacing: 0.6, marginBottom: 10 }}>
            UP NEXT
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar name={urgent.creator?.name ?? "C"} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "800", fontSize: 15 }}>
                {urgent.creator?.name ?? "Creator"}
              </Text>
              <Text style={{ color: BrandOpsTheme.colors.muted, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
                {urgent.review.hook}
              </Text>
            </View>
            {urgent.status === "pending" ? (
              <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "900", fontSize: 12 }}>NEW</Text>
            ) : null}
          </View>
        </Pressable>
      ) : null}

      {aiInsight ? (
        <View style={{ marginBottom: 28 }}>
          <Link href="/ai" asChild>
            <Pressable style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
              <Ionicons name="sparkles" size={20} color={BrandOpsTheme.colors.lime} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "800", fontSize: 12 }}>AI insight</Text>
                <Text style={{ color: BrandOpsTheme.colors.muted, marginTop: 6, lineHeight: 20, fontSize: 14 }}>{aiInsight}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={BrandOpsTheme.colors.subtle} />
            </Pressable>
          </Link>
        </View>
      ) : null}

      <View style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 11, fontWeight: "800", letterSpacing: 0.6 }}>CAMPAIGN PULSE</Text>
          <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "900", fontSize: 15 }}>
            ${metrics.spendThisWeek.toLocaleString()} this week
          </Text>
        </View>
        <View style={{ backgroundColor: BrandOpsTheme.colors.surface, borderRadius: 16, padding: 16 }}>
          <PulseChart values={metrics.weeklyPulse} label="" />
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 14 }}>
            <MiniStat label="Active" value={String(metrics.activeCampaigns)} />
            <MiniStat label="In review" value={String(metrics.reviewQueueCount)} />
            <MiniStat label="Creators" value={String(metrics.totalCreators)} />
          </View>
        </View>
      </View>

      <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 11, fontWeight: "800", letterSpacing: 0.6, marginTop: 8, marginBottom: 8 }}>
        RECENT
      </Text>
      {metrics.recentActivity.length === 0 ? (
        <ApiEmpty title="No activity yet" body="Submissions and approvals will show up here." />
      ) : (
        metrics.recentActivity.map((a) => (
          <View
            key={a.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 11,
              borderBottomWidth: 1,
              borderBottomColor: "rgba(255,255,255,0.04)",
            }}
          >
            <ActivityDot type={a.type === "approval" ? "approval" : a.type === "campaign" ? "campaign" : "submission"} />
            <Text style={{ flex: 1, marginLeft: 10, color: BrandOpsTheme.colors.text, fontWeight: "600", fontSize: 14 }}>
              {a.message}
            </Text>
            <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 12 }}>{formatRelativeTime(a.createdAt.toISOString())}</Text>
          </View>
        ))
      )}
    </BrandOpsScreen>
  );
}

function CreatorHome() {
  const router = useRouter();
  const { authUid, user } = useAuth();
  const payoutSetup = useCreatorPayoutSetup(authUid);
  const { campaigns, loading, error, refetch } = useFirestoreCampaigns({ status: "active" });
  const { submissions: mySubmissions } = useFirestoreMySubmissions();
  const { payments: myPayments } = useFirestoreCreatorPayments();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);
  const next = campaigns[0];
  const latestSubmission = mySubmissions[0];
  const revisionSubmission = mySubmissions.find((s) => s.status === "revision_requested");

  if (!isFirebaseConfigured()) {
    return (
      <BrandOpsScreen scroll glow>
        <ApiNotConfigured />
      </BrandOpsScreen>
    );
  }

  return (
    <BrandOpsScreen
      scroll
      glow
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={BrandOpsTheme.colors.lime} />}
    >
      <Text style={{ color: BrandOpsTheme.colors.subtle, fontWeight: "700" }}>Creator</Text>
      <CreatorStripeSetupBanner setup={payoutSetup} />

      <CreatorLaunchChecklist
        photoUrl={user?.photoURL}
        payoutSetup={payoutSetup}
        submissions={mySubmissions}
      />
      <CreatorDifferentiatorCard />

      {revisionSubmission ? (
        <Pressable
          onPress={() => router.push(`/submission/${revisionSubmission.id}` as never)}
          style={{ marginBottom: 16 }}
        >
          <BrandOpsCard variant="soft" style={{ borderColor: "rgba(255,193,7,0.35)", borderWidth: 1 }}>
            <Text style={{ color: BrandOpsTheme.colors.warning, fontWeight: "900", fontSize: 13 }}>Revision requested</Text>
            <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "800", fontSize: 16, marginTop: 6 }}>
              {revisionSubmission.campaignTitle}
            </Text>
            <Text style={{ color: BrandOpsTheme.colors.muted, marginTop: 6, fontSize: 13 }}>
              {revisionSubmission.notes?.trim() || "Brand asked for changes — tap to re-upload."}
            </Text>
          </BrandOpsCard>
        </Pressable>
      ) : null}

      <CreatorEarningsCard submissions={mySubmissions} payments={myPayments} payoutSetup={payoutSetup} style={{ marginBottom: 16 }} />

      {loading && !next ? <ApiLoading label="Loading campaigns…" /> : null}

      {error ? <ApiError message="Couldn't load campaigns." onRetry={() => void refetch()} /> : null}

      {!loading && !error && next ? (
        <Pressable
          onPress={() => router.push(campaignDetailPath(next, { creator: true }) as never)}
          style={{ marginTop: 16, marginBottom: 24 }}
        >
          <LinearGradient colors={["rgba(198,255,0,0.2)", "rgba(198,255,0,0.04)"]} style={{ borderRadius: 20, padding: 22 }}>
            <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "800", fontSize: 12 }}>NEXT UP</Text>
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 26, marginTop: 8 }}>{next.title}</Text>
            <Text style={{ color: BrandOpsTheme.colors.muted, marginTop: 8 }}>
              ${next.payoutPerVideo} if approved
              {next.deadline ? ` · due ${new Date(next.deadline).toLocaleDateString()}` : ""}
            </Text>
          </LinearGradient>
        </Pressable>
      ) : !loading && !error ? (
        <View style={{ marginTop: 16, marginBottom: 24 }}>
          <ApiEmpty
            title="No campaigns available yet"
            body="Check back soon or enable notifications in Settings so you know when new briefs drop."
            actionLabel="Browse campaigns"
            onAction={() => router.push("/(tabs)/campaigns" as never)}
          />
        </View>
      ) : null}
      {!latestSubmission && !loading && mySubmissions.length === 0 ? (
        <View style={{ marginBottom: 16 }}>
          <ApiEmpty
            title="No submissions yet"
            body="Pick an open campaign, film your UGC, and submit from the Upload tab."
            actionLabel="Find a campaign"
            onAction={() => router.push("/(tabs)/campaigns" as never)}
          />
        </View>
      ) : null}
      {latestSubmission ? (
        <Pressable
          onPress={() => router.push(`/submission/${latestSubmission.id}` as never)}
          style={{ marginBottom: 16 }}
        >
          <View
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: BrandOpsTheme.colors.border,
              backgroundColor: BrandOpsTheme.colors.surface,
              padding: 16,
            }}
          >
            <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "800", fontSize: 12 }}>YOUR SUBMISSION</Text>
            <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 17, marginTop: 8 }}>
              {latestSubmission.campaignTitle}
            </Text>
            <Text style={{ color: BrandOpsTheme.colors.muted, marginTop: 6, fontSize: 13 }}>
              Status: {latestSubmission.status.replace(/_/g, " ")} · tap to view
            </Text>
          </View>
        </Pressable>
      ) : null}

      <Link href="/(tabs)/campaigns" asChild>
        <Pressable>
          <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "900" }}>Browse open campaigns →</Text>
        </Pressable>
      </Link>
    </BrandOpsScreen>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 10, fontWeight: "700" }}>{label}</Text>
      <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 17 }}>{value}</Text>
    </View>
  );
}

function ActivityDot({ type }: { type: "approval" | "submission" | "campaign" }) {
  const color =
    type === "approval" ? BrandOpsTheme.colors.lime : type === "submission" ? BrandOpsTheme.colors.warning : BrandOpsTheme.colors.muted;
  return <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />;
}
