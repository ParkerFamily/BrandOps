import type { UserRole } from "@/lib/types";
import type { WorkspacesSetupState } from "@/lib/workspaceSetup";

/** Creators submit UGC; brands/agencies/managers approve and run campaigns. */
export function isCreatorRole(role: UserRole | null | undefined): boolean {
  return role === "creator";
}

export function isOperatorRole(role: UserRole | null | undefined): boolean {
  return role === "brand" || role === "agency" || role === "creator_manager";
}

/** Only brand-side roles can approve/reject creator submissions. */
export function canReviewSubmissions(role: UserRole | null | undefined): boolean {
  return isOperatorRole(role);
}

/** Resolve role after sign-in without clobbering creator accounts with a brand default. */
export function resolveSessionRole(
  firestoreRole: UserRole | null | undefined,
  cachedRole: UserRole | null | undefined,
  setup: WorkspacesSetupState
): UserRole | null {
  // Profile workspace switch / onboarding primary beats stale Firestore `role: brand` tags.
  if (setup.primary === "creator") return "creator";
  if (setup.primary === "brand") return "brand";
  if (setup.creator && !setup.brand) return "creator";
  if (setup.brand && !setup.creator) return "brand";

  if (firestoreRole === "creator") return "creator";
  if (firestoreRole) return firestoreRole;

  if (cachedRole === "creator") return "creator";
  if (cachedRole) return cachedRole;
  return null;
}

export function homeSubtitle(role: UserRole | null | undefined): string {
  if (isCreatorRole(role)) {
    return "Find campaigns, submit UGC, and track payouts. Premium, not a feed.";
  }
  if (role === "agency") {
    return "Multi-brand approvals and campaign pulse. Web remains your HQ.";
  }
  if (role === "creator_manager") {
    return "Roster submissions, revisions, and payouts in one place.";
  }
  return "Quick UGC approvals and campaign pulse. Web remains your HQ.";
}
