import { useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BrandOpsScreen } from "@/components/ui/BrandOpsScreen";
import { BrandOpsCard } from "@/components/ui/BrandOpsCard";
import { BrandOpsButton } from "@/components/ui/BrandOpsButton";
import { Avatar } from "@/components/ui/Avatar";
import { ApiEmpty } from "@/components/ui/ApiState";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { useAuth } from "@/contexts/AuthContext";
import { isFirebaseConfigured } from "@/lib/env";
import { workspaceLabel } from "@/lib/format";
import { canReviewSubmissions } from "@/lib/roleExperience";
import { computeBrandWorkspaceMetrics } from "@/lib/brandWorkspaceMetrics";
import { useFirestoreCampaigns } from "@/lib/campaignsFirestore";
import { useFirestoreMySubmissions, useFirestoreOwnerSubmissions } from "@/lib/useFirestoreOwnerSubmissions";
import { subscribeUserPaymentProfile } from "@/lib/paymentReadiness";
import { useCreatorPayoutSetup } from "@/lib/creatorPayoutSetup";
import {
  CreatorSetupStatusBadge,
  CreatorStripeSetupBanner,
} from "@/components/creator/CreatorStripeSetupBanner";
import { CreatorEarningsCard } from "@/components/creator/CreatorEarningsCard";
import { usePullToRefresh } from "@/lib/usePullToRefresh";
import { openAuthenticatedWebSession } from "@/lib/webHandoff";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, role, logout, authUid } = useAuth();
  const creator = !canReviewSubmissions(role);
  const payoutSetup = useCreatorPayoutSetup(creator ? authUid : null);
  const [stripeConnected, setStripeConnected] = useState(false);

  const { campaigns, refetch: refetchCampaigns } = useFirestoreCampaigns(creator ? { status: "active" } : { ownerOnly: true });
  const { submissions: ownerSubmissions } = useFirestoreOwnerSubmissions();
  const { submissions: mySubmissions } = useFirestoreMySubmissions();
  const submissions = creator ? mySubmissions : ownerSubmissions;

  const brandSnapshot = useMemo(() => {
    if (creator) return null;
    return computeBrandWorkspaceMetrics(campaigns, ownerSubmissions);
  }, [creator, campaigns, ownerSubmissions]);

  useEffect(() => {
    if (!authUid || creator) return;
    return subscribeUserPaymentProfile(authUid, (data) => {
      const connected = Boolean(
        data?.stripeCustomerId ||
          data?.stripeAccountId ||
          data?.stripeConnectAccountId ||
          data?.stripeConnected ||
          data?.stripeOnboardingComplete ||
          data?.payoutMethodReady
      );
      setStripeConnected(connected);
    });
  }, [authUid, creator]);

  const activeCampaigns = useMemo(
    () => (creator ? campaigns.length : campaigns.filter((c) => c.status === "active").length),
    [campaigns, creator]
  );

  const activeCreators = useMemo(() => {
    if (!creator) return brandSnapshot?.totalCreators ?? 0;
    const ids = new Set(submissions.map((s) => s.creatorFirebaseUid).filter(Boolean));
    return ids.size;
  }, [submissions, creator, brandSnapshot?.totalCreators]);

  const spendThisMonth = useMemo(() => {
    if (!creator) return brandSnapshot?.spendThisMonth ?? 0;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return submissions
      .filter((s) => s.status === "approved" && s.createdAt >= start)
      .reduce((sum, s) => sum + (s.payoutAmount ?? 0), 0);
  }, [submissions, creator, brandSnapshot?.spendThisMonth]);

  const { refreshing, onRefresh } = usePullToRefresh(refetchCampaigns);
  const workspaceName = workspaceLabel(user?.displayName, user?.email);

  if (!isFirebaseConfigured()) {
    return (
      <BrandOpsScreen scroll>
        <ApiEmpty title="Firebase required" body="Configure Firebase to sync your BrandOps workspace." />
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
      <BrandOpsCard variant="glass" style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Avatar name={user?.displayName ?? workspaceName} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 20 }}>
              {user?.displayName ?? workspaceName}
            </Text>
            <Text style={{ color: BrandOpsTheme.colors.muted, marginTop: 4 }}>{user?.email ?? "—"}</Text>
            <Text style={{ color: BrandOpsTheme.colors.subtle, marginTop: 6, fontSize: 12 }}>
              {creator ? "Creator workspace" : "Brand workspace"}
            </Text>
          </View>
        </View>
        {creator ? (
          <View style={{ marginTop: 12 }}>
            <CreatorSetupStatusBadge setup={payoutSetup} />
          </View>
        ) : (
          <View
            style={{
              marginTop: 12,
              alignSelf: "flex-start",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: BrandOpsTheme.colors.limeSoft,
            }}
          >
            <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "800", fontSize: 12 }}>
              Stripe · {stripeConnected ? "Connected" : "Not connected"}
            </Text>
          </View>
        )}
      </BrandOpsCard>

      {creator ? <CreatorStripeSetupBanner setup={payoutSetup} /> : null}

      {creator ? <CreatorEarningsCard submissions={mySubmissions} /> : null}

      {!creator ? (
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
          <MetricTile label="Spend this month" value={`$${spendThisMonth.toLocaleString()}`} />
          <MetricTile label="Active creators" value={String(activeCreators)} />
        </View>
      ) : null}

      <BrandOpsCard variant="soft" style={{ marginBottom: 14 }}>
        <ApiEmpty
          title="Team & billing on web"
          body="Invite teammates, connect channels, and manage billing from the BrandOps web dashboard."
        />
      </BrandOpsCard>

      <BrandOpsButton
        label={creator ? "Manage payouts" : "Manage billing"}
        variant="secondary"
        onPress={() => void openAuthenticatedWebSession(creator ? "payments" : "billing")}
      />

      <View style={{ height: 12 }} />

      <Pressable onPress={() => router.push("/settings" as never)}>
        {({ pressed }) => (
          <BrandOpsCard variant="soft" style={{ marginBottom: 14, opacity: pressed ? 0.9 : 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: BrandOpsTheme.colors.surface,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="settings-outline" size={20} color={BrandOpsTheme.colors.lime} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "800", fontSize: 16 }}>Settings</Text>
                <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 12, marginTop: 2 }}>
                  Privacy Policy, Terms of Service, app info
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={BrandOpsTheme.colors.subtle} />
            </View>
          </BrandOpsCard>
        )}
      </Pressable>

      <BrandOpsButton
        label="Log out"
        variant="danger"
        onPress={async () => {
          await logout();
          router.replace("/(auth)/login");
        }}
      />

      <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 11, textAlign: "center", marginTop: 16 }}>
        {activeCampaigns} active campaign{activeCampaigns === 1 ? "" : "s"}
      </Text>
    </BrandOpsScreen>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: BrandOpsTheme.colors.surface, borderRadius: 16, padding: 14 }}>
      <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 11, fontWeight: "700" }}>{label}</Text>
      <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 20, marginTop: 6 }}>{value}</Text>
    </View>
  );
}
