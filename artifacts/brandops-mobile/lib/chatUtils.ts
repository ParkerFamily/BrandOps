import { formatShortTime } from "@/lib/format";
import type { FirestoreSubmission } from "@/lib/submissionsFirestore";

export type ChatThread = {
  id: string;
  name: string;
  handle: string;
  campaign: string;
  lastMessage: string;
  time: string;
  unread: number;
  you: boolean;
  submissionId: string;
  statusBadge?: string | null;
  statusBadgeTone?: "lime" | "muted" | "warning" | "success";
};

function creatorUnreadCount(
  submission: FirestoreSubmission,
  viewedSubmissionIds?: Set<string>
): number {
  const viewed = viewedSubmissionIds?.has(submission.id) ?? false;
  if (viewed) return 0;
  if (submission.status === "revision_requested") return 1;
  if (submission.status === "approved" || submission.status === "rejected") return 1;
  return 0;
}

function creatorStatusBadge(
  submission: FirestoreSubmission,
  viewedSubmissionIds?: Set<string>
): { label: string; tone: "lime" | "muted" | "warning" | "success" } {
  if (submission.status === "revision_requested") {
    return { label: "Revision needed", tone: "warning" };
  }
  if (submission.status === "approved") {
    return { label: "Approved", tone: "success" };
  }
  if (submission.status === "rejected") {
    return { label: "Not approved", tone: "muted" };
  }
  if (viewedSubmissionIds?.has(submission.id)) {
    return { label: "Viewed", tone: "muted" };
  }
  return { label: "Submitted", tone: "lime" };
}

function statusMessage(status: FirestoreSubmission["status"], notes?: string | null): string {
  if (notes?.trim()) return notes.trim();
  switch (status) {
    case "pending":
      return "Submitted — awaiting review.";
    case "approved":
      return "Approved — payout queued.";
    case "revision_requested":
      return "Revision requested.";
    case "rejected":
      return "Submission rejected.";
    default:
      return "Updated.";
  }
}

function creatorName(submission: FirestoreSubmission): string {
  if (submission.creatorName) return submission.creatorName;
  if (submission.creatorEmail) {
    const local = submission.creatorEmail.split("@")[0];
    if (local) return local.replace(/[._]/g, " ");
  }
  return `Creator ${submission.creatorFirebaseUid.slice(0, 6)}`;
}

export function buildFirestoreChatThreads(
  submissions: FirestoreSubmission[] | undefined,
  options?: { asCreator?: boolean; viewedSubmissionIds?: Set<string> }
): ChatThread[] {
  const asCreator = options?.asCreator ?? false;
  const viewedSubmissionIds = options?.viewedSubmissionIds;
  const byKey = new Map<string, { thread: ChatThread; updatedAt: Date }>();

  for (const submission of submissions ?? []) {
    const key = `${submission.creatorFirebaseUid}-${submission.campaignDocId}`;
    const updatedAt = submission.createdAt;
    const existing = byKey.get(key);
    if (existing && existing.updatedAt.getTime() > updatedAt.getTime()) continue;

    const unread = asCreator
      ? creatorUnreadCount(submission, viewedSubmissionIds)
      : submission.status === "pending" || submission.status === "revision_requested"
        ? 1
        : 0;

    const badge = asCreator ? creatorStatusBadge(submission, viewedSubmissionIds) : null;

    byKey.set(key, {
      updatedAt,
      thread: {
        id: key,
        name: asCreator ? submission.campaignTitle : creatorName(submission),
        handle: asCreator
          ? statusMessage(submission.status, submission.notes)
          : submission.creatorEmail
            ? `@${submission.creatorEmail.split("@")[0]}`
            : "@creator",
        campaign: submission.campaignTitle,
        lastMessage: statusMessage(submission.status, submission.notes),
        time: formatShortTime(updatedAt.toISOString()),
        unread,
        you: asCreator ? submission.status === "revision_requested" : submission.status === "revision_requested",
        submissionId: submission.id,
        statusBadge: badge?.label ?? null,
        statusBadgeTone: badge?.tone,
      },
    });
  }

  return [...byKey.values()]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .map((entry) => entry.thread);
}

function apiStatusMessage(status: import("@workspace/api-client-react").Submission["status"], notes?: string | null): string {
  if (notes?.trim()) return notes.trim();
  switch (status) {
    case "pending":
      return "Submitted — awaiting review.";
    case "reviewing":
      return "In review.";
    case "approved":
      return "Approved — payout queued.";
    case "revision_requested":
      return "Revision requested.";
    case "rejected":
      return "Submission rejected.";
    case "paid":
      return "Paid out.";
    default:
      return "Updated.";
  }
}

export function buildChatThreads(submissions: import("@workspace/api-client-react").Submission[] | undefined): ChatThread[] {
  const byKey = new Map<string, { thread: ChatThread; updatedAt: string }>();

  for (const submission of submissions ?? []) {
    if (!submission.creator) continue;

    const key = `${submission.creatorId}-${submission.campaignId}`;
    const updatedAt = submission.updatedAt ?? submission.createdAt;
    const existing = byKey.get(key);
    if (existing && new Date(existing.updatedAt).getTime() > new Date(updatedAt).getTime()) continue;

    const unread =
      submission.status === "pending" || submission.status === "reviewing" || submission.status === "revision_requested"
        ? 1
        : 0;

    byKey.set(key, {
      updatedAt,
      thread: {
        id: key,
        name: submission.creator.name,
        handle: submission.creator.handle ?? `@creator${submission.creatorId}`,
        campaign: submission.campaign?.title ?? `Campaign #${submission.campaignId}`,
        lastMessage: apiStatusMessage(submission.status, submission.notes),
        time: formatShortTime(updatedAt),
        unread,
        you: submission.status === "revision_requested",
        submissionId: String(submission.id),
      },
    });
  }

  return [...byKey.values()]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map((entry) => entry.thread);
}
