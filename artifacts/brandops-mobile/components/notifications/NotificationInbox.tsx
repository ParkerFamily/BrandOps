import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { mobilePathFromNotification, notificationTypeLabel } from "@workspace/notifications";
import type { BrandOpsNotification } from "@workspace/notifications";
import { BrandOpsCard } from "@/components/ui/BrandOpsCard";
import { BrandOpsButton } from "@/components/ui/BrandOpsButton";
import { P, Label } from "@/components/ui/BrandOpsText";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { formatRelativeTime } from "@/lib/format";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/notificationsFirestore";
import { personalizeNotificationForViewer } from "@/lib/notificationCopy";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBadge } from "@/components/ui/StatusBadge";

type Props = {
  notifications: BrandOpsNotification[];
  unreadCount: number;
  loading?: boolean;
  compact?: boolean;
  viewerName?: string | null;
  viewerEmail?: string | null;
};

export function NotificationInbox({ notifications, unreadCount, loading, compact, viewerName, viewerEmail }: Props) {
  const router = useRouter();
  const { authUid } = useAuth();

  const openNotification = async (notification: BrandOpsNotification) => {
    if (authUid && !notification.read) {
      await markNotificationRead(authUid, notification.id);
    }
    const href = mobilePathFromNotification(notification);
    router.push(href as never);
  };

  if (loading && notifications.length === 0) {
    return (
      <BrandOpsCard variant="soft" style={{ marginBottom: 12 }}>
        <P>Loading notifications…</P>
      </BrandOpsCard>
    );
  }

  if (notifications.length === 0) {
    return (
      <BrandOpsCard variant="soft" style={{ marginBottom: 12 }}>
        <Label style={{ color: BrandOpsTheme.colors.lime }}>Notifications</Label>
        <P style={{ marginTop: 8 }}>You're all caught up — new updates will appear here.</P>
      </BrandOpsCard>
    );
  }

  return (
    <View style={{ marginBottom: compact ? 12 : 20 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 17 }}>
          Notifications{unreadCount > 0 ? ` · ${unreadCount}` : ""}
        </Text>
        {unreadCount > 0 && authUid ? (
          <BrandOpsButton
            label="Mark all read"
            variant="ghost"
            onPress={() => void markAllNotificationsRead(authUid, notifications)}
          />
        ) : null}
      </View>

      <View style={{ gap: 8 }}>
        {notifications.slice(0, compact ? 5 : 30).map((notification) => {
          const copy = personalizeNotificationForViewer(notification, {
            displayName: viewerName,
            email: viewerEmail,
          });

          return (
          <Pressable key={notification.id} onPress={() => void openNotification(notification)}>
            {({ pressed }) => (
              <BrandOpsCard
                variant={notification.read ? "soft" : "elevated"}
                style={{
                  opacity: pressed ? 0.92 : 1,
                  borderColor: notification.read ? undefined : "rgba(198,255,0,0.25)",
                  borderWidth: notification.read ? 0 : 1,
                }}
              >
                <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      backgroundColor: notification.read
                        ? "rgba(255,255,255,0.06)"
                        : BrandOpsTheme.colors.limeSoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name={notification.read ? "notifications-outline" : "notifications"}
                      size={18}
                      color={notification.read ? BrandOpsTheme.colors.subtle : BrandOpsTheme.colors.lime}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 11, fontWeight: "800" }}>
                        {notificationTypeLabel(notification.type).toUpperCase()}
                      </Text>
                      {notification.read ? <StatusBadge label="Viewed" tone="muted" /> : null}
                    </View>
                    <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "800", fontSize: 15, marginTop: 2 }}>
                      {copy.title}
                    </Text>
                    <P style={{ marginTop: 4, fontSize: 13, lineHeight: 19 }}>{copy.body}</P>
                    <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 12, marginTop: 6 }}>
                      {formatRelativeTime(notification.createdAt.toISOString())}
                    </Text>
                  </View>
                </View>
              </BrandOpsCard>
            )}
          </Pressable>
          );
        })}
      </View>
    </View>
  );
}
