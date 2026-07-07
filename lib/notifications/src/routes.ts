import type { BrandOpsNotification, NotificationScreen, PushPayload } from "./types";

/** Web app routes (wouter). */
export function webPathFromNotification(
  notification: Pick<BrandOpsNotification, "screen" | "entityId" | "entityType" | "campaignDocId">
): string {
  return webPathFromPayload({
    screen: notification.screen,
    entityId: notification.entityId,
    entityType: notification.entityType,
    campaignDocId: notification.campaignDocId ?? undefined,
  });
}

function webSubmissionPath(entityId: string | undefined): string {
  if (!entityId) return "/submissions";
  const isNumeric = /^\d+$/.test(entityId);
  return isNumeric ? `/submissions?submission=${entityId}` : `/submissions?sid=${encodeURIComponent(entityId)}`;
}

export function webPathFromPayload(payload: PushPayload): string {
  const id = payload.entityId;

  switch (payload.screen) {
    case "approval":
    case "review":
      return webSubmissionPath(id);
    case "revision":
    case "submission":
      return payload.entityType === "submission" ? webSubmissionPath(id) : "/submissions";
    case "payout":
      return "/payments";
    case "campaign":
    case "campaign_invite":
      return id ? `/campaigns/${id}` : "/campaigns";
    case "messages":
      return "/submissions";
    case "home":
    default:
      return "/dashboard";
  }
}

/** Expo Router paths. */
export function mobilePathFromNotification(
  notification: Pick<BrandOpsNotification, "screen" | "entityId" | "entityType" | "campaignDocId">
): string {
  return mobilePathFromPayload({
    screen: notification.screen,
    entityId: notification.entityId,
    entityType: notification.entityType,
    campaignDocId: notification.campaignDocId ?? undefined,
  });
}

export function mobilePathFromPayload(payload: PushPayload): string {
  const id = payload.entityId;

  switch (payload.screen) {
    case "approval":
    case "review":
      return id ? `/submission/${id}` : "/(tabs)/upload";
    case "revision":
    case "submission":
      return id ? `/submission/${id}` : "/(tabs)/upload";
    case "payout":
      return "/(tabs)/profile";
    case "campaign":
    case "campaign_invite":
      return id ? `/campaign/${id}` : "/(tabs)/campaigns";
    case "messages":
      return "/(tabs)/messages";
    case "home":
    default:
      return "/(tabs)";
  }
}

export function pushPayloadFromNotification(
  notification: Pick<
    BrandOpsNotification,
    "screen" | "entityId" | "entityType" | "campaignDocId" | "title" | "body"
  >
): PushPayload {
  return {
    screen: notification.screen as NotificationScreen,
    entityType: notification.entityType,
    entityId: notification.entityId,
    campaignDocId: notification.campaignDocId ?? undefined,
    title: notification.title,
    body: notification.body,
  };
}
