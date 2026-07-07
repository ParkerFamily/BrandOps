import { useMemo } from "react";
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
import { computeBrandPaymentTotals, filterPaymentsForBrandOwner } from "@/lib/creatorPaymentsFirestore";
import { useFirestoreCampaigns } from "@/lib/campaignsFirestore";
import { useFirestoreMySubmissions, useFirestoreOwnerSubmissions } from "@/lib/useFirestoreOwnerSubmissions";
import { useFirestoreBrandPayments } from "@/lib/useFirestoreBrandPayments";
import { useFirestoreCreatorPayments } from "@/lib/useFirestoreCreatorPayments";
import { useCreatorPayoutSetup } from "@/lib/creatorPayoutSetup";
import {
  CreatorSetupStatusBadge,
  CreatorStripeSetupBanner,
} from "@/components/creator/CreatorStripeSetupBanner";
import { CreatorLaunchChecklist } from "@/components/creator/CreatorLaunchChecklist";
import { CreatorEarningsCard } from "@/components/creator/CreatorEarningsCard";
import { usePullToRefresh } from "@/lib/usePullToRefresh";
import { openCreatorConnectDashboard } from "@/lib/webHandoff";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, role, logout, authUid, authEmail } = useAuth();
  const creator = !canReviewSubmissions(role);
  const payoutSetup = useCreatorPayoutSetup(creator ? authUid : null);

  const { campaigns, refetch: refetchCampaigns } = useFirestoreCampaigns(creator ? { status: "active" } : { ownerOnly: true });
  const campaignDocIds = useMemo(() => campaigns.map((c) => c.firestoreDocId), [campaigns]);
  const { submissions: ownerSubmissions } = useFirestoreOwnerSubmissions(null, campaignDocIds);
  const { payments: brandPayments } = useFirestoreBrandPayments();
  const { submissions: mySubmissions } = useFirestoreMySubmissions();
  const { payments: myPayments } = useFirestoreCreatorPayments();
  const submissions = creator ? mySubmissions : ownerSubmissions;

  const brandSnapshot = useMemo(() => {
    if (creator) return null;
    return computeBrandWorkspaceMetrics(campaigns, ownerSubmissions, authUid, brandPayments);
  }, [creator, campaigns, ownerSubmissions, authUid, brandPayments]);

  const activeCampaigns = useMemo(
    () => (creator ? campaigns.length : campaigns.filter((c) => c.status === "active").length),
    [campaigns, creator]
  );

  const { refreshing, onRefresh } = usePullToRefresh(refetchCampaigns);

  const scopedBrandPayments = useMemo(() => {
    if (creator || !authUid) return [];
    return filterPaymentsForBrandOwner(
      brandPayments,
      authUid,
      campaignDocIds,
      ownerSubmissions.map((s) => s.id),
      campaigns.map((c) => c.title)
    );
  }, [creator, authUid, brandPayments, campaignDocIds, ownerSubmissions, campaigns]);

  const brandPaymentSummary = useMemo(
    () =>
      creator
        ? { totalPaid: 0, totalProcessing: 0, totalPending: 0, paidThisMonth: 0 }
        : computeBrandPaymentTotals(scopedBrandPayments),
    [creator, scopedBrandPayments]
  );

  const totalPaid = useMemo(() => {
    if (!creator) return brandPaymentSummary.totalPaid;
    return myPayments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  }, [myPayments, creator, brandPaymentSummary.totalPaid]);

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
            <Text style={{ color: BrandOpsTheme.colors.muted, marginTop: 4 }}>{authEmail ?? user?.email ?? "—"}</Text>
            <Text style={{ color: BrandOpsTheme.colors.subtle, marginTop: 6, fontSize: 12 }}>
              {creator ? "Creator workspace" : "Brand workspace"} · role {role ?? "—"}
            </Text>
            {authUid ? (
              <Text style={{ color: BrandOpsTheme.colors.subtle, marginTop: 4, fontSize: 10 }} selectable>
                UID {authUid}
              </Text>
            ) : null}
          </View>
        </View>
        {creator ? (
          <View style={{ marginTop: 12 }}>
            <CreatorSetupStatusBadge setup={payoutSetup} />
          </View>
        ) : null}
      </BrandOpsCard>

      {creator ? <CreatorStripeSetupBanner setup={payoutSetup} /> : null}

      {creator ? (
        <CreatorLaunchChecklist
          photoUrl={user?.photoURL}
          payoutSetup={payoutSetup}
          submissions={mySubmissions}
          compact
        />
      ) : null}

      {creator ? <CreatorEarningsCard submissions={mySubmissions} payments={myPayments} payoutSetup={payoutSetup} /> : null}

      {!creator ? (
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
          <MetricTile label="Total paid" value={`$${totalPaid.toLocaleString()}`} />
          <MetricTile label="Paid this month" value={`$${brandPaymentSummary.paidThisMonth.toLocaleString()}`} />
        </View>
      ) : null}

      {!creator && brandPaymentSummary.totalProcessing > 0 ? (
        <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 12, marginTop: -8, marginBottom: 16 }}>
          ${brandPaymentSummary.totalProcessing.toLocaleString()} processing
        </Text>
      ) : null}

      {creator ? (
        <BrandOpsButton
          label="Manage payouts"
          variant="secondary"
          onPress={() => void (authUid ? openCreatorConnectDashboard(authUid) : undefined)}
        />
      ) : (
        <BrandOpsCard variant="soft" style={{ marginBottom: 14 }}>
          <ApiEmpty
            title="Review on mobile"
            body="Use this app to review creator submissions. Create and manage campaigns on the BrandOps web dashboard."
          />
        </BrandOpsCard>
      )}

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
                  Account, notifications, payouts, security & more
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
