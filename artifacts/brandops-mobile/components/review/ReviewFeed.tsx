import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useQueryClient } from "@tanstack/react-query";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { TAB_BAR_BASE_HEIGHT } from "@/constants/layout";
import { Avatar } from "@/components/ui/Avatar";
import { ApiLoading } from "@/components/ui/ApiState";
import { BrandOpsButton } from "@/components/ui/BrandOpsButton";
import { safeHaptics } from "@/lib/safeHaptics";
import { useAuth } from "@/contexts/AuthContext";
import { canReviewSubmissions } from "@/lib/roleExperience";
import { ReviewVideoPlayer } from "@/components/review/ReviewVideoPlayer";
import { ReviewAiPanel } from "@/components/review/ReviewAiPanel";
import { saveSubmissionVideoToDevice } from "@/lib/saveSubmissionVideo";
import { updateSubmissionStatus } from "@/lib/submissionsApi";
import type { ReviewSubmission } from "@/lib/submissionUtils";
import { formatRelativeTime } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const VIDEO_W = Math.min(SCREEN_W - 32, 340);

function reviewVideoHeight(pageH: number): number {
  return Math.min(VIDEO_W * (16 / 9), pageH * 0.5);
}

export type ReviewFeedSubmission = ReviewSubmission & {
  firestoreDocId?: string;
  storagePath?: string | null;
  submissionType?: "upload" | "link";
  creatorFirebaseUid?: string;
  campaignOwnerUid?: string;
  subtitlesContent?: string | null;
  processedVideoUrl?: string | null;
};

function reviewStatusLabel(status: ReviewSubmission["status"]): { label: string; tone: "warning" | "lime" | "muted" } {
  if (status === "revision_requested") return { label: "Revision needed", tone: "warning" };
  if (status === "reviewing") return { label: "In review", tone: "lime" };
  return { label: "Pending review", tone: "warning" };
}

function submissionRef(item: ReviewFeedSubmission): string {
  if (item.firestoreDocId) return item.firestoreDocId.slice(-8).toUpperCase();
  return `#${item.id}`;
}

type Props = {
  submissions: ReviewFeedSubmission[];
  onReviewed?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  loading?: boolean;
};

export function ReviewFeed({ submissions, onReviewed, refreshing, onRefresh, loading }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { role, authUid } = useAuth();
  const canReview = canReviewSubmissions(role);
  const [index, setIndex] = useState(0);
  const [notes, setNotes] = useState("");
  const [scrub, setScrub] = useState(0.35);
  const swipeX = useRef(new Animated.Value(0)).current;
  const listRef = useRef<FlatList<ReviewFeedSubmission>>(null);

  const footerH = 88 + insets.bottom;
  const headerH = 52 + insets.top;
  const tabBarH = TAB_BAR_BASE_HEIGHT + Math.max(insets.bottom, 10);
  const pageH = SCREEN_H - headerH - footerH - tabBarH;

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.y / pageH);
    if (i !== index && i >= 0 && i < submissions.length) {
      setIndex(i);
      setNotes("");
      setScrub(0.12);
      swipeX.setValue(0);
    }
  };

  const current = submissions[index];

  const act = async (type: "approve" | "reject" | "revision") => {
    if (!current || !canReview) return;
    if (current.creatorFirebaseUid && authUid && current.creatorFirebaseUid === authUid) {
      Toast.show({ type: "error", text1: "Not allowed", text2: "Creators cannot review their own submissions." });
      return;
    }

    const status =
      type === "approve" ? "approved" : type === "reject" ? "rejected" : "revision_requested";

    const synced = await updateSubmissionStatus(
      current.id,
      status,
      notes || undefined,
      current.firestoreDocId
    );
    if (synced) {
      if (current.firestoreDocId) {
        onReviewed?.();
      } else {
        await queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
      }
    }

    if (type === "approve") {
      void safeHaptics.success();
      Toast.show({
        type: "success",
        text1: "Approved",
        text2: synced
          ? `$${current.payoutAmount ?? 250} queued · ${current.creator?.name} emailed`
          : `$${current.payoutAmount ?? 250} queued for ${current.creator?.name}`,
      });
    } else if (type === "reject") {
      void safeHaptics.impactLight();
      Toast.show({
        type: "error",
        text1: "Rejected",
        text2: synced ? `${current.creator?.name} notified` : `${current.creator?.name} marked rejected`,
      });
    } else {
      void safeHaptics.selection();
      Toast.show({
        type: "info",
        text1: "Revision sent",
        text2: synced ? "Creator notified by email" : notes || "Creator will re-upload.",
      });
    }
    swipeX.setValue(0);
  };

  if (!submissions.length) {
    if (loading) {
      return (
        <View style={{ flex: 1, backgroundColor: BrandOpsTheme.colors.bg }}>
          <ApiLoading label="Loading review queue…" />
        </View>
      );
    }

    if (!canReview) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: BrandOpsTheme.colors.bg }}>
          <Ionicons name="cloud-upload-outline" size={48} color={BrandOpsTheme.colors.lime} />
          <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 20, marginTop: 16 }}>Creator workspace</Text>
          <Text style={{ color: BrandOpsTheme.colors.muted, marginTop: 8, textAlign: "center", lineHeight: 22 }}>
            This tab is for uploading UGC and tracking your submissions — not approving other creators&apos; videos.
          </Text>
          <View style={{ marginTop: 20, width: "100%", maxWidth: 320, gap: 10 }}>
            <BrandOpsButton label="Go to Upload" onPress={() => router.replace("/(tabs)/upload")} />
            <BrandOpsButton
              label="View Activity"
              variant="secondary"
              onPress={() => router.replace("/(tabs)/messages")}
            />
            <BrandOpsButton
              label="Switch to Creator in Profile"
              variant="ghost"
              onPress={() => router.replace("/(tabs)/profile")}
            />
          </View>
        </View>
      );
    }

    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: BrandOpsTheme.colors.bg }}>
        <Ionicons name="checkmark-done-circle" size={48} color={BrandOpsTheme.colors.lime} />
        <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 20, marginTop: 16 }}>All caught up</Text>
        <Text style={{ color: BrandOpsTheme.colors.muted, marginTop: 8, textAlign: "center", lineHeight: 22 }}>
          No creator videos are waiting for approval on your campaigns. New submissions appear here in real time.
        </Text>
      </View>
    );
  }

  const renderItem: ListRenderItem<ReviewFeedSubmission> = ({ item }) => (
    <ReviewPage
      item={item}
      pageH={pageH}
      videoH={reviewVideoHeight(pageH)}
      swipeX={swipeX}
      scrub={scrub}
      onScrub={setScrub}
      notes={notes}
      onNotesChange={setNotes}
      onSwipeEnd={(dir) => {
        if (dir === "right") void act("approve");
        if (dir === "left") void act("reject");
      }}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: BrandOpsTheme.colors.bg }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 8 }}>
        <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 20 }}>Review</Text>
        <Text style={{ color: BrandOpsTheme.colors.subtle, marginTop: 2, fontSize: 13 }}>
          {submissions.length > 1
            ? `${index + 1} of ${submissions.length} · swipe ↑↓ between creators`
            : `${index + 1} of ${submissions.length} · scroll for AI details`}
        </Text>
      </View>

      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
        data={submissions}
        keyExtractor={(s) => s.firestoreDocId ?? String(s.id)}
        renderItem={renderItem}
        pagingEnabled={submissions.length > 1}
        scrollEnabled={submissions.length > 1}
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        snapToInterval={submissions.length > 1 ? pageH : undefined}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum={submissions.length > 1}
        getItemLayout={(_, i) => ({ length: pageH, offset: pageH * i, index: i })}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={BrandOpsTheme.colors.lime} />
          ) : undefined
        }
      />

      <View
        style={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 8,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: "rgba(255,255,255,0.05)",
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <IconAction icon="close" label="Reject" onPress={() => void act("reject")} />
          <IconAction icon="refresh" label="Revise" onPress={() => void act("revision")} />
          <IconAction icon="checkmark" label="Approve" primary onPress={() => void act("approve")} />
        </View>
        <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 11, textAlign: "center", marginTop: 8 }}>
          Swipe video ← reject · approve →
        </Text>
      </View>
    </View>
  );
}

function ReviewPage({
  item,
  pageH,
  videoH,
  swipeX,
  notes,
  onNotesChange,
  onSwipeEnd,
}: {
  item: ReviewFeedSubmission;
  pageH: number;
  videoH: number;
  swipeX: Animated.Value;
  scrub: number;
  onScrub: (n: number) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  onSwipeEnd: (dir: "left" | "right" | null) => void;
}) {
  const router = useRouter();
  const [showNotes, setShowNotes] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setShowNotes(false);
  }, [item.firestoreDocId, item.id]);

  const { review } = item;
  const creator = item.creator;
  const statusMeta = reviewStatusLabel(item.status);
  const submittedAgo = formatRelativeTime(item.createdAt);
  const refLabel = submissionRef(item);
  const fmtFollowers =
    creator && creator.followerCount >= 1000 ? `${(creator.followerCount / 1000).toFixed(0)}K` : String(creator?.followerCount ?? 0);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderMove: (_, g) => swipeX.setValue(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dx > 80) {
          Animated.timing(swipeX, { toValue: 120, duration: 120, useNativeDriver: true }).start(() => onSwipeEnd("right"));
        } else if (g.dx < -80) {
          Animated.timing(swipeX, { toValue: -120, duration: 120, useNativeDriver: true }).start(() => onSwipeEnd("left"));
        } else {
          Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
          onSwipeEnd(null);
        }
      },
    })
  ).current;

  const rotate = swipeX.interpolate({ inputRange: [-120, 0, 120], outputRange: ["-4deg", "0deg", "4deg"] });
  const approveOpacity = swipeX.interpolate({ inputRange: [0, 80], outputRange: [0, 1], extrapolate: "clamp" });
  const rejectOpacity = swipeX.interpolate({ inputRange: [-80, 0], outputRange: [1, 0], extrapolate: "clamp" });

  return (
    <View style={{ height: pageH, paddingTop: 4 }}>
      <View style={{ width: VIDEO_W, alignSelf: "center", gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 16 }} numberOfLines={1}>
              {item.campaign?.title ?? "Campaign submission"}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
              <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 11, fontWeight: "700" }}>
                Submission {refLabel}
              </Text>
              {submittedAgo ? (
                <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 11 }}>· {submittedAgo}</Text>
              ) : null}
            </View>
          </View>
          {item.firestoreDocId ? (
            <Pressable
              onPress={() => router.push(`/submission/${item.firestoreDocId}` as never)}
              hitSlop={8}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: BrandOpsTheme.colors.surface,
                borderWidth: 1,
                borderColor: BrandOpsTheme.colors.border,
              }}
            >
              <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "800", fontSize: 11 }}>Details</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={{ color: BrandOpsTheme.colors.muted, fontSize: 12 }}>
          {creator?.name ?? "Creator"}
          {creator?.handle ? ` · ${creator.handle}` : ""}
          {item.submissionType === "link" ? " · external link" : " · uploaded video"}
        </Text>
      </View>

      <View style={{ width: VIDEO_W, alignSelf: "center", marginTop: 4 }}>
        <Animated.View
          {...pan.panHandlers}
          style={{
            borderRadius: 20,
            overflow: "hidden",
            backgroundColor: "#111",
            transform: [{ translateX: swipeX }, { rotate }],
          }}
        >
          <View style={{ position: "relative" }}>
            <ReviewVideoPlayer
              videoUrl={item.processedVideoUrl ?? item.videoUrl}
              storagePath={item.storagePath}
              submissionType={item.submissionType}
              height={videoH}
              variant="immersive"
            />

            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                padding: 14,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                <Avatar name={creator?.name ?? "C"} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }} numberOfLines={1}>
                    {creator?.name}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>{creator?.handle}</Text>
                </View>
              </View>
              <View style={{ backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
                <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "900", fontSize: 11 }}>{review.postedLabel}</Text>
              </View>
            </View>

            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: 14,
                gap: 8,
              }}
            >
              <View
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: "rgba(0,0,0,0.5)",
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "700" }}>{review.postedLabel}</Text>
              </View>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15, lineHeight: 20 }}>"{review.hook}"</Text>
            </View>
          </View>

          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: videoH / 2 - 20,
              right: 12,
              opacity: approveOpacity,
            }}
          >
            <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "900", fontSize: 22, borderWidth: 2, borderColor: BrandOpsTheme.colors.lime, padding: 8 }}>
              APPROVE
            </Text>
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: videoH / 2 - 20,
              left: 12,
              opacity: rejectOpacity,
            }}
          >
            <Text style={{ color: BrandOpsTheme.colors.danger, fontWeight: "900", fontSize: 22, borderWidth: 2, borderColor: BrandOpsTheme.colors.danger, padding: 8 }}>
              REJECT
            </Text>
          </Animated.View>
        </Animated.View>
      </View>

      <ScrollView
        style={{ flex: 1, marginTop: 12 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ width: VIDEO_W, alignSelf: "center", gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
              <Ionicons name="videocam" size={14} color={BrandOpsTheme.colors.lime} />
              <Text style={{ color: BrandOpsTheme.colors.muted, fontSize: 12, fontWeight: "700" }} numberOfLines={1}>
                Tap video to play · swipe ← reject · approve →
              </Text>
            </View>
            <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "900", fontSize: 16 }}>
              ${item.payoutAmount ?? item.campaign?.payoutPerVideo ?? 0}
            </Text>
          </View>

          <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 12 }}>
            {fmtFollowers} followers · {creator?.engagementRate?.toFixed(1)}% ER · {creator?.approvedVideos} approved
          </Text>

          {item.videoUrl ? null : (
            <Text style={{ color: BrandOpsTheme.colors.warning, fontSize: 12 }}>
              Waiting for video upload — creator may have submitted a link only.
            </Text>
          )}

          <View style={{ gap: 8 }}>
            <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 11, fontWeight: "800", letterSpacing: 0.6 }}>
              EXPORT
            </Text>
            <Pressable
              disabled={saving || !item.videoUrl}
              onPress={() => {
                void (async () => {
                  try {
                    setSaving(true);
                    await saveSubmissionVideoToDevice({
                      videoUrl: item.videoUrl,
                      storagePath: item.storagePath,
                      submissionType: item.submissionType,
                      fileName: item.campaign?.title ?? item.creator?.name ?? "submission",
                    });
                    Toast.show({
                      type: "success",
                      text1: "Saved to device",
                      text2: "Video is in your Photos library.",
                    });
                  } catch (err) {
                    const message = err instanceof Error ? err.message : "Try again.";
                    Toast.show({ type: "error", text1: "Could not save", text2: message });
                  } finally {
                    setSaving(false);
                  }
                })();
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: BrandOpsTheme.colors.surface,
                borderWidth: 1,
                borderColor: BrandOpsTheme.colors.border,
                opacity: saving || !item.videoUrl ? 0.55 : 1,
              }}
            >
              {saving ? (
                <Text style={{ color: BrandOpsTheme.colors.muted, fontWeight: "800", fontSize: 13 }}>Saving…</Text>
              ) : (
                <>
                  <Ionicons name="download-outline" size={18} color={BrandOpsTheme.colors.lime} />
                  <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "800", fontSize: 13 }}>Save to device</Text>
                </>
              )}
            </Pressable>
          </View>

          {showNotes ? (
            <TextInput
              value={notes}
              onChangeText={onNotesChange}
              placeholder="Revision notes (optional)…"
              placeholderTextColor={BrandOpsTheme.colors.subtle}
              autoCorrect={false}
              spellCheck={false}
              textContentType="none"
              returnKeyType="done"
              blurOnSubmit
              style={{
                height: 40,
                borderRadius: 12,
                paddingHorizontal: 14,
                backgroundColor: BrandOpsTheme.colors.surface,
                color: BrandOpsTheme.colors.text,
                fontSize: 14,
                borderWidth: 1,
                borderColor: BrandOpsTheme.colors.border,
              }}
            />
          ) : (
            <Pressable onPress={() => setShowNotes(true)} hitSlop={8}>
              <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 13, fontWeight: "700" }}>
                + Add revision notes
              </Text>
            </Pressable>
          )}

          <ReviewAiPanel
            item={item}
            transcript={item.subtitlesContent}
            submissionDocId={item.firestoreDocId}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function IconAction({
  icon,
  label,
  primary,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ alignItems: "center", minWidth: 72 }}>
      {({ pressed }) => (
        <>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: primary ? BrandOpsTheme.colors.lime : BrandOpsTheme.colors.surface,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.85 : 1,
            }}
          >
            <Ionicons name={icon} size={22} color={primary ? "#0A0A0A" : BrandOpsTheme.colors.text} />
          </View>
          <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 11, marginTop: 4, fontWeight: "700" }}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
