import type { DocumentData } from "firebase/firestore";

export type CampaignBrief = {
  title: string;
  description: string;
  creatorBrief: string;
  platform: string;
  contentType: string;
  niche: string;
  payoutPerVideo: number;
  totalBudget: number;
  deadline: Date | null;
  tone: string | null;
  videosNeeded: number | null;
  approvalCriteria: string[];
  deliverables: string[];
  creatorRequirements: string[];
  usageRights: string | null;
};

function pickList(data: DocumentData | undefined, ...keys: string[]): string[] {
  if (!data) return [];
  for (const key of keys) {
    const raw = data[key];
    if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
    if (typeof raw === "string" && raw.trim()) return [raw.trim()];
  }
  return [];
}

function pickString(data: DocumentData | undefined, ...keys: string[]): string {
  if (!data) return "";
  for (const key of keys) {
    const value = data[key];
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function pickNumber(data: DocumentData | undefined, ...keys: string[]): number | null {
  if (!data) return null;
  for (const key of keys) {
    const raw = data[key];
    if (raw != null && !Number.isNaN(Number(raw))) return Number(raw);
  }
  return null;
}

function pickCriteria(data: DocumentData | undefined): string[] {
  if (!data) return [];
  const raw = data.approvalCriteria ?? data.doList;
  if (!Array.isArray(raw)) return [];
  return raw.map(String).filter(Boolean);
}

export function parseCampaignBrief(data: DocumentData): CampaignBrief {
  const ai = (data.aiData as DocumentData | undefined) ?? {};

  return {
    title: pickString(data, "title") || pickString(ai, "title") || "Campaign",
    description: pickString(data, "description", "brief", "summary") || pickString(ai, "description", "brief", "summary"),
    creatorBrief:
      pickString(data, "creatorBrief") ||
      pickString(ai, "creatorBrief", "creatorInstructions", "brief") ||
      pickString(data, "description", "brief"),
    platform: pickString(data, "platform") || pickString(ai, "platform") || "tiktok",
    contentType:
      pickString(data, "contentType", "format", "videoFormat") ||
      pickString(ai, "contentType", "format", "videoFormat") ||
      "UGC video",
    niche: pickString(data, "niche", "creatorType") || pickString(ai, "niche", "creatorType") || "General",
    payoutPerVideo: pickNumber(data, "payoutPerVideo", "payout") ?? pickNumber(ai, "payoutPerVideo", "payout") ?? 0,
    totalBudget: pickNumber(data, "totalBudget", "budget") ?? pickNumber(ai, "totalBudget", "budget") ?? 0,
    deadline: null,
    tone: pickString(data, "tone") || pickString(ai, "tone", "toneGuidance") || null,
    videosNeeded: pickNumber(data, "videosNeeded") ?? pickNumber(ai, "suggestedVideoCount", "videosNeeded"),
    approvalCriteria: [...pickCriteria(data), ...pickCriteria(ai)],
    deliverables: [...pickList(data, "deliverables", "deliverableList"), ...pickList(ai, "deliverables", "deliverableList")],
    creatorRequirements: [
      ...pickList(data, "creatorRequirements", "requirements", "creatorCriteria"),
      ...pickList(ai, "creatorRequirements", "requirements", "creatorCriteria"),
    ],
    usageRights:
      pickString(data, "usageRights", "rights", "usage") ||
      pickString(ai, "usageRights", "rights", "usage") ||
      null,
  };
}
