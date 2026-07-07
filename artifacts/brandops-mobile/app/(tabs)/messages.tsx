import { useMemo, useState, useEffect } from "react";
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { BrandOpsScreen } from "@/components/ui/BrandOpsScreen";
import { Avatar } from "@/components/ui/Avatar";
import { ApiEmpty, ApiLoading } from "@/components/ui/ApiState";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { buildFirestoreChatThreads, type ChatThread } from "@/lib/chatUtils";
import { useAuth } from "@/contexts/AuthContext";
import { canReviewSubmissions } from "@/lib/roleExperience";
import { useFirestoreMySubmissions, useFirestoreOwnerSubmissions } from "@/lib/useFirestoreOwnerSubmissions";
import { isFirebaseConfigured } from "@/lib/env";
import { NotificationInbox } from "@/components/notifications/NotificationInbox";
import { useNotifications } from "@/lib/notificationsFirestore";
import { useFirestoreCampaigns } from "@/lib/campaignsFirestore";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useCreatorActivityState } from "@/lib/creatorActivityStorage";
import { usePullToRefresh } from "@/lib/usePullToRefresh";

export default function MessagesScreen() {
  const router = useRouter();
  const { user, role, authUid } = useAuth();
  const { viewedSubmissionIds, markSubmissionViewed } = useCreatorActivityState();
  const [active, setActive] = useState<ChatThread | null>(null);
  const creator = !canReviewSubmissions(role);
  const { submissions: mySubmissions, loading: myLoading } = useFirestoreMySubmissions();
  const { submissions: ownerSubmissions, loading: ownerLoading } = useFirestoreOwnerSubmissions();
  const submissions = creator ? mySubmissions : ownerSubmissions;
  const loading = creator ? myLoading : ownerLoading;
  const { notifications, unreadCount, loading: notificationsLoading } = useNotifications();
  const { refetch: refetchCampaigns } = useFirestoreCampaigns(creator ? { status: "active" } : { ownerOnly: true });
  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    await refetchCampaigns();
  });

  const threads = useMemo(() => {
    if (creator) {
      return buildFirestoreChatThreads(submissions, { asCreator: true, viewedSubmissionIds });
    }
    return buildFirestoreChatThreads(submissions);
  }, [submissions, creator, viewedSubmissionIds]);

  if (active) {
    return (
      <ChatThreadView
        thread={active}
        onBack={() => setActive(null)}
        onOpen={() => void markSubmissionViewed(active.submissionId)}
      />
    );
  }

  if (!isFirebaseConfigured() || !authUid) {
    return (
      <BrandOpsScreen scroll>
        <ApiEmpty title="Sign in required" body="Sign in to see campaign message threads." />
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
      <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 28, marginBottom: 4 }}>Activity</Text>
      <Text style={{ color: BrandOpsTheme.colors.muted, marginBottom: 20 }}>
        Push and in-app updates sync across web and mobile.
      </Text>

      <NotificationInbox
        notifications={notifications}
        unreadCount={unreadCount}
        loading={notificationsLoading}
        viewerName={user?.displayName ?? null}
        viewerEmail={user?.email ?? null}
      />

      <Text style={{ color: BrandOpsTheme.colors.subtle, fontWeight: "800", fontSize: 11, letterSpacing: 0.8, marginBottom: 10 }}>
        CAMPAIGN THREADS
      </Text>
      {loading && threads.length === 0 ? <ApiLoading label="Loading threads…" /> : null}

      {!loading && threads.length === 0 ? (
        <ApiEmpty
          title={creator ? "No activity yet" : "No threads yet"}
          body={
            creator
              ? "Submit to a campaign to get approval, revision, and payout updates here. Turn on push notifications in Settings."
              : "Submission updates with creators will appear here."
          }
          actionLabel={creator ? "Browse campaigns" : undefined}
          onAction={creator ? () => router.push("/(tabs)/campaigns" as never) : undefined}
        />
      ) : null}

      <View style={{ gap: 4 }}>
        {threads.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => {
              void markSubmissionViewed(t.submissionId);
              setActive(t);
            }}
          >
            {({ pressed }) => (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 14,
                  opacity: pressed ? 0.85 : 1,
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(255,255,255,0.04)",
                }}
              >
                <Avatar name={t.name} size={48} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "800", fontSize: 16 }}>{t.name}</Text>
                    <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 12 }}>{t.time}</Text>
                  </View>
                  <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 12, marginTop: 2 }}>{t.campaign}</Text>
                  <Text style={{ color: BrandOpsTheme.colors.muted, fontSize: 14, marginTop: 4 }} numberOfLines={1}>
                    {t.you ? `You: ${t.lastMessage}` : t.lastMessage}
                  </Text>
                </View>
                {t.unread > 0 ? (
                  <View
                    style={{
                      minWidth: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: BrandOpsTheme.colors.lime,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: 6,
                    }}
                  >
                    <Text style={{ color: "#0A0A0A", fontWeight: "900", fontSize: 11 }}>{t.unread}</Text>
                  </View>
                ) : t.statusBadge && creator ? (
                  <StatusBadge label={t.statusBadge} tone={t.statusBadgeTone ?? "muted"} />
                ) : null}
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </BrandOpsScreen>
  );
}

function ChatThreadView({
  thread,
  onBack,
  onOpen,
}: {
  thread: ChatThread;
  onBack: () => void;
  onOpen?: () => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");

  useEffect(() => {
    onOpen?.();
  }, [onOpen]);

  return (
    <BrandOpsScreen padded={false}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255,255,255,0.06)",
        }}
      >
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "800", fontSize: 16 }}>← Back</Text>
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900" }}>{thread.name}</Text>
          <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 12 }}>{thread.campaign}</Text>
        </View>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }} contentContainerStyle={{ paddingBottom: 24 }}>
        <View
          style={{
            alignSelf: "flex-start",
            maxWidth: "82%",
            marginBottom: 10,
            backgroundColor: BrandOpsTheme.colors.surface,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 18,
            borderBottomLeftRadius: 4,
          }}
        >
          <Text style={{ color: BrandOpsTheme.colors.text, fontSize: 15, lineHeight: 21 }}>{thread.lastMessage}</Text>
        </View>
        <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 12, marginBottom: 16 }}>
          Status thread from submission
        </Text>
        <Pressable onPress={() => router.push(`/submission/${thread.submissionId}` as never)}>
          <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "800" }}>View submission →</Text>
        </Pressable>
      </ScrollView>

      <View
        style={{
          flexDirection: "row",
          gap: 10,
          padding: 12,
          paddingBottom: 16,
          borderTopWidth: 1,
          borderTopColor: "rgba(255,255,255,0.06)",
        }}
      >
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Reply from BrandOps web…"
          placeholderTextColor={BrandOpsTheme.colors.subtle}
          editable={false}
          style={{
            flex: 1,
            height: 44,
            borderRadius: 22,
            paddingHorizontal: 16,
            backgroundColor: BrandOpsTheme.colors.surface,
            color: BrandOpsTheme.colors.subtle,
          }}
        />
      </View>
    </BrandOpsScreen>
  );
}
