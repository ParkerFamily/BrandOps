import type { CampaignBrief } from "@/lib/campaignBrief";
import type { FirestoreCampaign } from "@/lib/campaignsFirestore";
import { getApiAuthHeaders, getApiBaseUrl, isApiConfigured } from "@/lib/apiClient";
import { buildWhatWeNeed, buildCreatorVideoSteps } from "@/lib/quickCampaignBrief";
import { buildDeliverableChecklist } from "@/lib/deliverableChecklist";

export type CreatorCampaignAi = {
  summary: string;
  whatToFilm?: string;
  exampleScripts?: string[];
  goal?: string;
  taskSteps: string[];
  hooks: string[];
  deliverableChecklist: string[];
  estimatedMinutes: number;
  source: "ai" | "fallback";
};

export type BrandCampaignAi = {
  summary: string;
  highlights: string[];
  creatorAsk: string;
  source: "ai" | "fallback";
};

export type CreatorReviewCoach = {
  approvalLikelihood: number;
  summary: string;
  improvements: string[];
  strengths: string[];
  source: "ai" | "fallback";
};

function briefPayload(
  campaign: FirestoreCampaign,
  brief: CampaignBrief,
  deadline: Date | null
) {
  return {
    title: campaign.title,
    platform: brief.platform || campaign.platform,
    contentType: brief.contentType,
    niche: brief.niche,
    payoutPerVideo: brief.payoutPerVideo || campaign.payoutPerVideo,
    totalBudget: brief.totalBudget || campaign.totalBudget,
    videosNeeded: brief.videosNeeded,
    deadline:
      deadline && !Number.isNaN(deadline.getTime())
        ? deadline.toLocaleDateString(undefined, { month: "long", day: "numeric" })
        : null,
    creatorBrief: brief.creatorBrief,
    description: brief.description,
    tone: brief.tone,
    deliverables: brief.deliverables,
    approvalCriteria: brief.approvalCriteria,
    usageRights: brief.usageRights,
  };
}

function fallbackAi(brief: CampaignBrief, deadline: Date | null): CreatorCampaignAi {
  return {
    source: "fallback",
    summary: buildWhatWeNeed(brief),
    estimatedMinutes: 45,
    taskSteps: buildCreatorVideoSteps(brief, deadline).slice(0, 6),
    hooks: [
      `POV: you just tried ${brief.title}`,
      `Nobody talks about this part of ${brief.title.split(" ")[0] ?? "the brand"}`,
      `Here's the honest take on ${brief.title}`,
    ],
    deliverableChecklist: buildDeliverableChecklist(brief),
  };
}

export async function loadCreatorCampaignAi(
  campaign: FirestoreCampaign,
  brief: CampaignBrief,
  deadline: Date | null
): Promise<CreatorCampaignAi> {
  if (!isApiConfigured()) return fallbackAi(brief, deadline);

  const base = getApiBaseUrl();
  if (!base) return fallbackAi(brief, deadline);

  try {
    const authHeaders = await getApiAuthHeaders();
    const res = await fetch(`${base}/openai/creator-task-brief`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(briefPayload(campaign, brief, deadline)),
    });

    if (!res.ok) return fallbackAi(brief, deadline);

    const data = (await res.json()) as {
      summary?: string;
      whatToFilm?: string;
      exampleScripts?: string[];
      goal?: string;
      taskSteps?: string[];
      steps?: string[];
      hooks?: string[];
      deliverableChecklist?: string[];
      estimatedMinutes?: number;
    };

    const taskSteps = (data.taskSteps ?? data.steps ?? []).map(String).filter(Boolean);
    const hooks = (data.hooks ?? []).map(String).filter(Boolean);
    const exampleScripts = (data.exampleScripts ?? []).map(String).filter(Boolean);
    const summary = String(data.summary ?? "").trim() || buildWhatWeNeed(brief, taskSteps);
    if (!taskSteps.length && !exampleScripts.length && !hooks.length) return fallbackAi(brief, deadline);

    return {
      source: "ai",
      summary,
      whatToFilm: String(data.whatToFilm ?? "").trim() || undefined,
      exampleScripts: exampleScripts.length ? exampleScripts.slice(0, 4) : undefined,
      goal: String(data.goal ?? "").trim() || undefined,
      taskSteps: taskSteps.slice(0, 6),
      hooks: hooks.slice(0, 6),
      deliverableChecklist: buildDeliverableChecklist(brief, data.deliverableChecklist),
      estimatedMinutes: Number(data.estimatedMinutes) > 0 ? Number(data.estimatedMinutes) : 45,
    };
  } catch (err) {
    if (__DEV__) console.warn("[BrandOps AI] creator-task-brief error", err);
    return fallbackAi(brief, deadline);
  }
}

function fallbackBrandAi(campaign: FirestoreCampaign, brief: CampaignBrief): BrandCampaignAi {
  const highlights = [
    `$${brief.payoutPerVideo || campaign.payoutPerVideo || 0} per approved video`,
    brief.contentType || "Vertical UGC",
    ...brief.approvalCriteria.slice(0, 2),
  ].filter(Boolean);

  return {
    source: "fallback",
    summary: buildWhatWeNeed(brief),
    highlights: highlights.slice(0, 4),
    creatorAsk:
      brief.creatorBrief?.split(/\n+/)[0]?.trim() ||
      brief.description?.split(/\n+/)[0]?.trim() ||
      "Authentic short-form UGC that matches the campaign goals.",
  };
}

export async function loadBrandCampaignAi(
  campaign: FirestoreCampaign,
  brief: CampaignBrief,
  deadline: Date | null
): Promise<BrandCampaignAi> {
  if (!isApiConfigured()) return fallbackBrandAi(campaign, brief);

  const base = getApiBaseUrl();
  if (!base) return fallbackBrandAi(campaign, brief);

  try {
    const authHeaders = await getApiAuthHeaders();
    const res = await fetch(`${base}/openai/brand-campaign-brief`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(briefPayload(campaign, brief, deadline)),
    });

    if (!res.ok) return fallbackBrandAi(campaign, brief);

    const data = (await res.json()) as {
      summary?: string;
      highlights?: string[];
      creatorAsk?: string;
    };

    const summary = String(data.summary ?? "").trim();
    const highlights = (data.highlights ?? []).map(String).filter(Boolean);
    if (!summary) return fallbackBrandAi(campaign, brief);

    return {
      source: "ai",
      summary,
      highlights: highlights.slice(0, 4),
      creatorAsk: String(data.creatorAsk ?? fallbackBrandAi(campaign, brief).creatorAsk),
    };
  } catch (err) {
    if (__DEV__) console.warn("[BrandOps AI] brand-campaign-brief error", err);
    return fallbackBrandAi(campaign, brief);
  }
}

export async function loadMoreCreatorHooks(
  campaign: FirestoreCampaign,
  brief: CampaignBrief,
  deadline: Date | null,
  existing: string[]
): Promise<string[]> {
  if (!isApiConfigured()) {
    return [
      `Real talk about ${brief.title}`,
      `3 things I noticed after using this`,
      `Would you try this? Be honest.`,
    ].filter((h) => !existing.includes(h));
  }

  const base = getApiBaseUrl();
  if (!base) return [];

  try {
    const authHeaders = await getApiAuthHeaders();
    const res = await fetch(`${base}/openai/creator-more-hooks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ ...briefPayload(campaign, brief, deadline), existingHooks: existing }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { hooks?: string[] };
    return (data.hooks ?? []).map(String).filter(Boolean).filter((h) => !existing.includes(h));
  } catch {
    return [];
  }
}

export async function analyzeDraftWithCoach(
  campaign: FirestoreCampaign,
  brief: CampaignBrief,
  draft: { videoUrl?: string; notes?: string }
): Promise<CreatorReviewCoach> {
  const fallback: CreatorReviewCoach = {
    source: "fallback",
    approvalLikelihood: 72,
    summary: "Strong concept — tighten your hook and keep the product mention in the first 5 seconds.",
    strengths: ["Clear vertical format", "Authentic tone potential"],
    improvements: ["Open with a bolder hook", "Check audio levels before exporting"],
  };

  if (!isApiConfigured()) return fallback;

  const base = getApiBaseUrl();
  if (!base) return fallback;

  try {
    const authHeaders = await getApiAuthHeaders();
    const res = await fetch(`${base}/openai/creator-review-coach`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({
        campaignTitle: campaign.title,
        platform: brief.platform || campaign.platform,
        creatorBrief: brief.creatorBrief || brief.description,
        approvalCriteria: brief.approvalCriteria,
        videoUrl: draft.videoUrl ?? "",
        notes: draft.notes ?? "",
      }),
    });
    if (!res.ok) return fallback;

    const data = (await res.json()) as {
      approvalLikelihood?: number;
      summary?: string;
      improvements?: string[];
      strengths?: string[];
    };

    return {
      source: "ai",
      approvalLikelihood: Math.min(100, Math.max(0, Number(data.approvalLikelihood) || 70)),
      summary: String(data.summary ?? fallback.summary),
      improvements: (data.improvements ?? fallback.improvements).map(String).slice(0, 4),
      strengths: (data.strengths ?? fallback.strengths).map(String).slice(0, 3),
    };
  } catch {
    return fallback;
  }
}

/** @deprecated use loadCreatorCampaignAi */
export async function simplifyBriefWithAi(
  campaign: FirestoreCampaign,
  brief: CampaignBrief,
  deadline: Date | null
) {
  const result = await loadCreatorCampaignAi(campaign, brief, deadline);
  return { steps: result.taskSteps, hooks: result.hooks, source: result.source };
}
