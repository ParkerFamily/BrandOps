import type { DocumentData } from "firebase/firestore";

/** Firestore fields that may identify the campaign owner / workspace. */
export const CAMPAIGN_OWNER_FIELDS = [
  "ownerFirebaseUid",
  "owner_firebase_uid",
  "ownerId",
  "workspaceId",
  "brandUid",
  "ownerEmail",
  "authorEmail",
  "userId",
  "createdBy",
] as const;

export type CampaignOwnerField = (typeof CAMPAIGN_OWNER_FIELDS)[number];

export function resolveWorkspaceId(uid: string, userDoc?: DocumentData | null): string {
  const fromProfile = userDoc?.workspaceId ?? userDoc?.workspace_id;
  if (fromProfile != null && String(fromProfile).trim()) {
    return String(fromProfile).trim();
  }
  return uid;
}

export function ownerLookupValues(uid: string, workspaceId: string): string[] {
  return [...new Set([uid, workspaceId].filter(Boolean))];
}

export function readOwnerField(data: DocumentData, field: CampaignOwnerField): string | null {
  const value = data[field];
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

export function hasAssignedOwner(data: DocumentData): boolean {
  return CAMPAIGN_OWNER_FIELDS.some((field) => Boolean(readOwnerField(data, field)));
}

/** True when any ownership field matches the signed-in user or their workspace. */
export function matchesCampaignOwner(
  data: DocumentData,
  uid: string,
  workspaceId: string,
  email?: string | null
): boolean {
  const allowed = new Set(ownerLookupValues(uid, workspaceId));
  const normalizedEmail = email?.trim().toLowerCase() ?? null;

  return CAMPAIGN_OWNER_FIELDS.some((field) => {
    const value = readOwnerField(data, field);
    if (value == null) return false;
    if (field === "ownerEmail" || field === "authorEmail") {
      return normalizedEmail != null && value.toLowerCase() === normalizedEmail;
    }
    return allowed.has(value);
  });
}

export function ownershipSnapshot(data: DocumentData): Record<CampaignOwnerField, string | null> {
  return CAMPAIGN_OWNER_FIELDS.reduce(
    (acc, field) => {
      acc[field] = readOwnerField(data, field);
      return acc;
    },
    {} as Record<CampaignOwnerField, string | null>
  );
}

export function logCampaignOwnershipDebug(
  context: string,
  uid: string,
  workspaceId: string,
  docs: { id: string; data: DocumentData }[]
): void {
  if (!__DEV__) return;
  console.log(`[BrandOps campaigns] ${context}`, {
    authUid: uid,
    workspaceId,
    docCount: docs.length,
    docs: docs.map((d) => ({
      id: d.id,
      owners: ownershipSnapshot(d.data),
      title: (d.data.title as string | undefined) ?? (d.data.aiData as DocumentData | undefined)?.title ?? null,
    })),
  });
}
