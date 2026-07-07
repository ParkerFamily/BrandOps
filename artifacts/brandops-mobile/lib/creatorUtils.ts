import type { Creator } from "@workspace/api-client-react";

export function resolveCreatorId(creators: Creator[] | undefined, email?: string | null): number | null {
  if (!creators?.length) return null;
  if (email) {
    const match = creators.find((c) => c.email?.toLowerCase() === email.toLowerCase());
    if (match) return match.id;
  }
  return creators[0]?.id ?? null;
}
