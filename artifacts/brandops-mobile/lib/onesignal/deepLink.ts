import type { Router } from "expo-router";
import { mobilePathFromPayload, type PushPayload } from "@workspace/notifications";

export type { PushPayload as PushNotificationData } from "@workspace/notifications";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

export function parseNotificationData(raw: unknown): PushPayload | null {
  const record = asRecord(raw);
  if (!record) return null;

  const screen = record.screen;
  const entityType = record.entityType;
  const entityId = record.entityId ?? record.id;

  if (typeof screen !== "string" || typeof entityType !== "string" || entityId == null) {
    return null;
  }

  return {
    screen: screen as PushPayload["screen"],
    entityType: entityType as PushPayload["entityType"],
    entityId: String(entityId),
    campaignDocId: typeof record.campaignDocId === "string" ? record.campaignDocId : undefined,
    title: typeof record.title === "string" ? record.title : undefined,
    body: typeof record.body === "string" ? record.body : undefined,
  };
}

export function routeFromNotificationData(data: PushPayload | null): string | null {
  if (!data) return null;
  return mobilePathFromPayload(data);
}

export function openNotificationRoute(router: Router, raw: unknown): boolean {
  const data = parseNotificationData(raw);
  const href = routeFromNotificationData(data);
  if (!href) return false;
  router.push(href as never);
  return true;
}
