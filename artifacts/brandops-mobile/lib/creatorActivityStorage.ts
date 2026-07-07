import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import type { FirestoreSubmission } from "@/lib/submissionsFirestore";

const STORAGE_KEY = "brandops:creatorActivity:v1";

type CreatorActivityState = {
  viewedCampaignIds: string[];
  viewedSubmissionIds: string[];
};

const EMPTY: CreatorActivityState = {
  viewedCampaignIds: [],
  viewedSubmissionIds: [],
};

async function readState(): Promise<CreatorActivityState> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw) as Partial<CreatorActivityState>;
    return {
      viewedCampaignIds: Array.isArray(parsed.viewedCampaignIds) ? parsed.viewedCampaignIds.map(String) : [],
      viewedSubmissionIds: Array.isArray(parsed.viewedSubmissionIds) ? parsed.viewedSubmissionIds.map(String) : [],
    };
  } catch {
    return EMPTY;
  }
}

async function writeState(state: CreatorActivityState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uniqAppend(list: string[], id: string): string[] {
  if (list.includes(id)) return list;
  return [...list, id];
}

export async function markCreatorCampaignViewed(campaignDocId: string): Promise<void> {
  const state = await readState();
  state.viewedCampaignIds = uniqAppend(state.viewedCampaignIds, campaignDocId);
  await writeState(state);
}

export async function markCreatorSubmissionViewed(submissionId: string): Promise<void> {
  const state = await readState();
  state.viewedSubmissionIds = uniqAppend(state.viewedSubmissionIds, submissionId);
  await writeState(state);
}

export function useCreatorActivityState() {
  const [viewedCampaignIds, setViewedCampaignIds] = useState<Set<string>>(new Set());
  const [viewedSubmissionIds, setViewedSubmissionIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void readState().then((state) => {
      if (cancelled) return;
      setViewedCampaignIds(new Set(state.viewedCampaignIds));
      setViewedSubmissionIds(new Set(state.viewedSubmissionIds));
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const markCampaignViewed = useCallback(async (campaignDocId: string) => {
    setViewedCampaignIds((prev) => new Set(prev).add(campaignDocId));
    await markCreatorCampaignViewed(campaignDocId);
  }, []);

  const markSubmissionViewed = useCallback(async (submissionId: string) => {
    setViewedSubmissionIds((prev) => new Set(prev).add(submissionId));
    await markCreatorSubmissionViewed(submissionId);
  }, []);

  return { ready, viewedCampaignIds, viewedSubmissionIds, markCampaignViewed, markSubmissionViewed };
}

export function latestSubmissionByCampaign(
  submissions: FirestoreSubmission[] | undefined
): Map<string, FirestoreSubmission> {
  const map = new Map<string, FirestoreSubmission>();
  for (const submission of submissions ?? []) {
    const key = submission.campaignDocId;
    if (!key) continue;
    const existing = map.get(key);
    if (!existing || submission.createdAt.getTime() > existing.createdAt.getTime()) {
      map.set(key, submission);
    }
  }
  return map;
}

export type CreatorCampaignBadge = {
  label: string;
  tone: "lime" | "muted" | "warning" | "success";
};

export function creatorCampaignBadge(input: {
  campaignDocId: string;
  submission?: FirestoreSubmission | null;
  viewedCampaignIds: Set<string>;
}): CreatorCampaignBadge | null {
  const submission = input.submission;
  if (submission) {
    switch (submission.status) {
      case "pending":
        return { label: "Submitted", tone: "lime" };
      case "approved":
        return { label: "Approved", tone: "success" };
      case "revision_requested":
        return { label: "Revision needed", tone: "warning" };
      case "rejected":
        return { label: "Not approved", tone: "muted" };
      default:
        return { label: "Submitted", tone: "lime" };
    }
  }

  if (input.viewedCampaignIds.has(input.campaignDocId)) {
    return { label: "Viewed", tone: "muted" };
  }

  return { label: "New", tone: "lime" };
}

export function creatorSubmissionStatusLabel(status: FirestoreSubmission["status"]): string {
  switch (status) {
    case "pending":
      return "Submitted";
    case "approved":
      return "Approved";
    case "revision_requested":
      return "Revision needed";
    case "rejected":
      return "Not approved";
    default:
      return "Updated";
  }
}
