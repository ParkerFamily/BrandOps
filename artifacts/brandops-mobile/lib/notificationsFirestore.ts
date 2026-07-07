import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import type { BrandOpsNotification, NotificationType } from "@workspace/notifications";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebase } from "@/lib/firebase";
import { isFirebaseConfigured } from "@/lib/env";
import { showEmptyLoading } from "@/lib/realtimeLoading";

function toDate(value: unknown): Date {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === "string" || typeof value === "number") return new Date(value);
  return new Date();
}

function mapNotification(id: string, data: DocumentData): BrandOpsNotification {
  return {
    id,
    type: (data.type as NotificationType) ?? "submission_received",
    title: String(data.title ?? "Notification"),
    body: String(data.body ?? ""),
    screen: data.screen as BrandOpsNotification["screen"],
    entityType: (data.entityType as BrandOpsNotification["entityType"]) ?? "submission",
    entityId: String(data.entityId ?? ""),
    campaignDocId: (data.campaignDocId as string | null | undefined) ?? null,
    campaignTitle: (data.campaignTitle as string | null | undefined) ?? null,
    read: Boolean(data.read),
    createdAt: toDate(data.createdAt),
  };
}

export function subscribeUserNotifications(
  uid: string,
  onData: (rows: BrandOpsNotification[]) => void,
  options?: { limit?: number }
): Unsubscribe {
  const firebase = getFirebase();
  if (!firebase) {
    onData([]);
    return () => {};
  }

  const q = query(
    collection(firebase.db, "users", uid, "notifications"),
    orderBy("createdAt", "desc"),
    limit(options?.limit ?? 50)
  );

  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => mapNotification(d.id, d.data())));
    },
    () => onData([])
  );
}

export async function markNotificationRead(uid: string, notificationId: string): Promise<void> {
  const firebase = getFirebase();
  if (!firebase) return;
  await updateDoc(doc(firebase.db, "users", uid, "notifications", notificationId), { read: true });
}

export async function markAllNotificationsRead(uid: string, notifications: BrandOpsNotification[]): Promise<void> {
  const unread = notifications.filter((n) => !n.read);
  await Promise.all(unread.map((n) => markNotificationRead(uid, n.id)));
}

export function useNotifications(limitCount = 50) {
  const { authUid, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<BrandOpsNotification[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured() || !isAuthenticated || !authUid) {
      setNotifications([]);
      setReady(true);
      return;
    }

    setReady(false);
    return subscribeUserNotifications(
      authUid,
      (rows) => {
        setNotifications(rows);
        setReady(true);
      },
      { limit: limitCount }
    );
  }, [authUid, isAuthenticated, limitCount]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  return { notifications, unreadCount, loading: showEmptyLoading(!ready, notifications.length) };
}
