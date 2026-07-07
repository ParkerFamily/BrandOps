import type { CampaignBrief } from "@/lib/campaignBrief";

function splitToItems(text: string): string[] {
  return text
    .split(/\n+|(?<=[.!?])\s+(?=[A-Z])|;\s*/)
    .map((part) => part.replace(/^[-•*]\s*/, "").trim())
    .filter((part) => part.length > 8 && part.length < 160);
}

/** Turn long deliverable paragraphs into short checklist lines. */
export function buildDeliverableChecklist(brief: CampaignBrief, aiItems?: string[]): string[] {
  if (aiItems?.length) return aiItems.slice(0, 8);

  const merged: string[] = [];
  for (const item of brief.deliverables) {
    merged.push(...splitToItems(item));
  }

  if (merged.length >= 2) return merged.slice(0, 8);

  const fromBrief = splitToItems(brief.creatorBrief || brief.description || "");
  if (fromBrief.length >= 2) return fromBrief.slice(0, 6);

  return [
    "Vertical 9:16 video",
    "15–30 seconds",
    "Strong hook in first 1–3 seconds",
    "Clean audio and good lighting",
    "No watermarks or copyrighted music",
  ];
}
