import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import Toast from "react-native-toast-message";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { isOneSignalConfigured } from "@/lib/onesignal/config";
import { initOneSignal, linkOneSignalUser, unlinkOneSignalUser } from "@/lib/onesignal/initOneSignal";
import { clearNotificationBadge } from "@/lib/onesignal/badges";
import { useNotifications } from "@/lib/notificationsFirestore";

export function OneSignalBootstrap() {
  const router = useRouter();
  const { user } = useAuth();
  const { notifications } = useNotifications(10);
  const seenIds = useRef<Set<string>>(new Set());
  const seeded = useRef(false);

  useEffect(() => {
    if (!isOneSignalConfigured()) return;

    let cleanup = () => {};
    void initOneSignal({
      router,
      firebaseUid: user?.uid ?? null,
    }).then((unsub) => {
      cleanup = unsub;
    });

    return () => cleanup();
  }, [router, user?.uid]);

  useEffect(() => {
    if (!isOneSignalConfigured()) return;

    if (user?.uid) {
      void linkOneSignalUser(user.uid);
      return;
    }

    void unlinkOneSignalUser();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void linkOneSignalUser(user.uid);
        void clearNotificationBadge();
      }
    });

    return () => sub.remove();
  }, [user?.uid]);

  useEffect(() => {
    if (user?.uid) {
      void clearNotificationBadge();
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || notifications.length === 0) return;

    if (!seeded.current) {
      notifications.forEach((n) => seenIds.current.add(n.id));
      seeded.current = true;
      return;
    }

    const fresh = notifications.find((n) => !seenIds.current.has(n.id));
    if (!fresh) return;
    seenIds.current.add(fresh.id);

    Toast.show({
      type: fresh.type.includes("approved") || fresh.type.includes("payout") ? "success" : "info",
      text1: fresh.title,
      text2: fresh.body,
      visibilityTime: 5000,
    });
  }, [notifications, user?.uid]);

  return null;
}
