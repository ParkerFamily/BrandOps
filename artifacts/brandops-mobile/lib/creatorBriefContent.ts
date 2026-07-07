import type { CampaignBrief } from "@/lib/campaignBrief";
import type { FirestoreCampaign } from "@/lib/campaignsFirestore";
import type { CreatorCampaignAi } from "@/lib/creatorBriefAi";
import {
  buildCompactRequirements,
  formatDeadlineLong,
  inferDuration,
  buildWhatWeNeed,
} from "@/lib/quickCampaignBrief";

export type CreatorBriefDocument = {
  whatToFilm: string;
  exampleScripts: string[];
  goal: string;
  requirements: string[];
  paymentLine: string;
  paymentNote: string;
  deadlineLine: string | null;
  usageRights: string | null;
  /** Long legal / policy text — shown collapsed at the bottom. */
  legalDetails: string[];
};

function quoteScript(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed;
  return `"${trimmed}"`;
}

export function buildExampleScripts(
  campaign: FirestoreCampaign,
  brief: CampaignBrief,
  hooks?: string[]
): string[] {
  const brandName = campaign.title.replace(/UGC|Testing|Sprint|Campaign/gi, "").trim() || campaign.title;
  const fromHooks = (hooks ?? []).map(quoteScript).filter(Boolean);
  const templates = [
    `"I wish there was a platform where brands could pay creators directly for content."`,
    `"I just found ${brandName} and brands are literally paying creators for UGC videos."`,
    `"If you're a content creator looking for paid opportunities, this app is worth checking out."`,
    `Tell a quick story about creating content and getting paid by brands.`,
  ];

  const merged = [...fromHooks];
  for (const line of templates) {
    if (merged.length >= 4) break;
    if (!merged.includes(line)) merged.push(line);
  }
  return merged.slice(0, 4);
}

function buildGoal(brief: CampaignBrief, aiGoal?: string): string {
  if (aiGoal?.trim()) return aiGoal.trim();

  const tone = brief.tone ? ` Tone: ${brief.tone.split(".")[0]?.trim()}.` : "";
  return `We are testing different hooks, creator personalities, and selling angles.${tone} This does NOT need to look like a commercial — natural iPhone-style videos perform best.`;
}

function buildWhatToFilm(brief: CampaignBrief, aiWhat?: string): string {
  if (aiWhat?.trim()) return aiWhat.trim();

  const duration = inferDuration(brief.contentType, brief.platform.toLowerCase());
  const core = buildWhatWeNeed(brief);
  return `Create a ${duration} video talking directly to the camera. ${core} Natural, iPhone-style footage works best — no polished commercial needed.`;
}

function buildRequirements(brief: CampaignBrief, aiItems?: string[]): string[] {
  const base = buildCompactRequirements(brief, aiItems);
  const extras = ["Talking directly to camera", "Good lighting", "No copyrighted music"];
  const merged = [...base];
  for (const item of extras) {
    if (!merged.some((x) => x.toLowerCase().includes(item.toLowerCase().slice(0, 12)))) {
      merged.push(item);
    }
  }
  return merged.slice(0, 8);
}

function buildLegalDetails(brief: CampaignBrief): string[] {
  const chunks: string[] = [];
  for (const item of [...brief.deliverables, ...brief.creatorRequirements, ...brief.approvalCriteria]) {
    const text = item.trim();
    if (text.length > 80) chunks.push(text);
  }
  return chunks.slice(0, 6);
}

export function buildCreatorBriefDocument(
  campaign: FirestoreCampaign,
  brief: CampaignBrief,
  deadline: Date | null,
  ai?: CreatorCampaignAi | null
): CreatorBriefDocument {
  const payout = brief.payoutPerVideo || campaign.payoutPerVideo || 0;
  const resolvedDeadline = deadline ?? brief.deadline;

  return {
    whatToFilm: buildWhatToFilm(brief, ai?.whatToFilm),
    exampleScripts: ai?.exampleScripts?.length
      ? ai.exampleScripts.map(quoteScript).slice(0, 4)
      : buildExampleScripts(campaign, brief, ai?.hooks),
    goal: buildGoal(brief, ai?.goal),
    requirements: buildRequirements(brief, ai?.deliverableChecklist),
    paymentLine: `$${payout} per approved video`,
    paymentNote: "Paid after approval",
    deadlineLine: formatDeadlineLong(resolvedDeadline),
    usageRights: brief.usageRights?.trim() || null,
    legalDetails: buildLegalDetails(brief),
  };
}
