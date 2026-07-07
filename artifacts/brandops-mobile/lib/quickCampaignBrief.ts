import type { CampaignBrief } from "@/lib/campaignBrief";
import type { FirestoreCampaign } from "@/lib/campaignsFirestore";
import { buildDeliverableChecklist } from "@/lib/deliverableChecklist";

function creatorStatusLabel(status: FirestoreCampaign["status"]): string {
  if (status === "active") return "Open";
  if (status === "draft") return "Draft";
  if (status === "paused") return "Paused";
  if (status === "completed") return "Closed";
  return status;
}

function formatDeadlineShort(date: Date | null): string | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function formatDeadlineLong(date: Date | null): string | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

export function inferDuration(contentType: string, platform: string): string {
  const match = contentType.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (match) return `${match[1]}–${match[2]} sec`;
  const single = contentType.match(/(\d+)\s*sec/i);
  if (single) return `${single[1]} sec`;
  if (platform.includes("youtube")) return "30–60 sec";
  return "15–30 sec";
}

export function estimateCompletionLabel(brief: CampaignBrief, estimatedMinutes?: number): string {
  if (estimatedMinutes && estimatedMinutes > 0) {
    if (estimatedMinutes < 60) return `~${estimatedMinutes} min`;
    const hours = Math.round((estimatedMinutes / 60) * 10) / 10;
    return `~${hours} hr`;
  }
  return "~45 min";
}

/** Short creator-facing bullets shown before AI expand. */
export function buildQuickBriefLines(brief: CampaignBrief): string[] {
  const raw = (brief.creatorBrief || brief.description || "").trim();
  const fromBrief = raw
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter((line) => line.length > 12 && line.length < 140);

  if (fromBrief.length >= 3) {
    return fromBrief.slice(0, 5);
  }

  const duration = inferDuration(brief.contentType, brief.platform.toLowerCase());
  const lines = [`Make a ${duration} vertical UGC video.`, "Strong hook in first 1–3 seconds."];

  const source = [brief.creatorBrief, brief.description, ...brief.approvalCriteria].join("\n");
  lines.push("No watermarks/copyrighted music.");
  lines.push(/audio|lighting|clean/i.test(source) ? "Clean audio/good lighting." : "Clean audio/good lighting.");

  if (brief.tone) {
    lines.push(`Tone: ${brief.tone.split(".")[0]?.trim()}.`);
  }

  return lines.slice(0, 5);
}

/** One-line job description for the creator task hero. */
export function buildWhatWeNeed(brief: CampaignBrief, taskSteps?: string[]): string {
  const raw = (brief.creatorBrief || brief.description || "").trim();
  if (raw) {
    const firstBlock = raw.split(/\n+/)[0]?.trim() ?? raw;
    if (firstBlock.length <= 220) return firstBlock;
    return `${firstBlock.slice(0, 217).trim()}…`;
  }
  if (taskSteps?.[0]) return taskSteps[0];
  return "Create authentic videos that show how the brand fits real creator workflows.";
}

/** Imperative step-by-step instructions for what to film. */
export function buildCreatorVideoSteps(
  brief: CampaignBrief,
  deadline: Date | null,
  aiSteps?: string[]
): string[] {
  if (aiSteps?.length) {
    return aiSteps.map((s) => s.replace(/^[-•*\d.)]+\s*/, "").trim()).filter(Boolean).slice(0, 6);
  }

  const duration = inferDuration(brief.contentType, brief.platform.toLowerCase());
  const checklist = buildDeliverableChecklist(brief);
  const coreMessage =
    brief.creatorBrief?.split(/\n+/)[0]?.trim() ||
    brief.description?.split(/\n+/)[0]?.trim() ||
    `Show how ${brief.title} helps with real creator or brand workflows.`;

  const steps: string[] = [
    `Record a ${duration} vertical (9:16) video on your phone.`,
    `Talk directly to camera: ${coreMessage}`,
  ];

  for (const item of checklist.slice(0, 3)) {
    const line = item.replace(/^[-•*]\s*/, "").trim();
    if (line.length > 8 && line.length < 120) {
      steps.push(line.endsWith(".") ? line : `${line}.`);
    }
  }

  if (brief.tone) {
    steps.push(`Keep the tone ${brief.tone.split(".")[0]?.trim().toLowerCase()}.`);
  }

  const deadlineLong = formatDeadlineLong(deadline ?? brief.deadline);
  steps.push(deadlineLong ? `Upload your finished clip by ${deadlineLong}.` : "Upload your finished clip below when ready.");

  return steps.slice(0, 6);
}

/** Short requirement chips — not full legal deliverables. */
export function buildCompactRequirements(brief: CampaignBrief, aiItems?: string[]): string[] {
  if (aiItems?.length) {
    return aiItems
      .map((item) => item.replace(/^[-•*✅]\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 6);
  }

  const duration = inferDuration(brief.contentType, brief.platform.toLowerCase());
  const items = [duration, "Vertical 9:16", "Clear audio", "Natural delivery"];

  for (const req of brief.creatorRequirements) {
    const short = req.replace(/^[-•*]\s*/, "").trim();
    if (short.length > 6 && short.length < 48 && !items.includes(short)) {
      items.push(short);
    }
    if (items.length >= 6) break;
  }

  return items.slice(0, 6);
}

/** Approval rules phrased as short "avoid" lines for creators. */
export function buildAvoidList(brief: CampaignBrief): string[] {
  return brief.approvalCriteria
    .map((item) => item.replace(/^[-•*]\s*/, "").trim())
    .filter((item) => /^(no|don't|do not|avoid|never|without)/i.test(item) || item.length < 80)
    .slice(0, 4);
}

export function formatVideosNeeded(brief: CampaignBrief, campaign: FirestoreCampaign): string {
  if (brief.videosNeeded && brief.videosNeeded > 0) {
    return `Need ${brief.videosNeeded} video${brief.videosNeeded === 1 ? "" : "s"}`;
  }
  const payout = brief.payoutPerVideo || campaign.payoutPerVideo || 0;
  const budget = brief.totalBudget || campaign.totalBudget || 0;
  if (payout > 0 && budget > 0) {
    const count = Math.max(1, Math.floor(budget / payout));
    return `Need ${count} video${count === 1 ? "" : "s"}`;
  }
  return "1 video";
}

export function buildCreatorTaskMeta(
  campaign: FirestoreCampaign,
  brief: CampaignBrief,
  deadline: Date | null
) {
  const resolvedDeadline = deadline ?? brief.deadline;
  return {
    title: campaign.title,
    payout: brief.payoutPerVideo || campaign.payoutPerVideo || 0,
    deadlineLabel: formatDeadlineShort(resolvedDeadline),
    deadlineLong: formatDeadlineLong(resolvedDeadline),
    videosNeeded: formatVideosNeeded(brief, campaign),
    status: creatorStatusLabel(campaign.status),
    canSubmit: campaign.status === "active",
  };
}
