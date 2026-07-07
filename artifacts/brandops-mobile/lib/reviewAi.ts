import { getApiAuthHeaders, getApiBaseUrl, isApiConfigured } from "@/lib/apiClient";
import type { ReviewSubmission } from "@/lib/submissionUtils";

export type SubmissionReviewAi = {
  hookStrength: number;
  brandFit: number;
  clarity: number;
  ugcAuthenticity: number;
  conversionPotential: number;
  overallScore: number;
  aiNotes: string;
  recommendation: "approve" | "revise" | "reject";
  strengths: string[];
  improvements: string[];
  source: "ai" | "fallback";
};

export async function analyzeSubmissionForReview(item: ReviewSubmission): Promise<SubmissionReviewAi> {
  const fallback: SubmissionReviewAi = {
    hookStrength: 7,
    brandFit: 7,
    clarity: 7,
    ugcAuthenticity: 8,
    conversionPotential: 7,
    overallScore: 72,
    aiNotes: "Review the hook in the first 3 seconds and confirm the brand message is clear before approving.",
    recommendation: "revise",
    strengths: ["Creator submitted on time"],
    improvements: ["Tighten the opening hook", "Add a clearer call to action"],
    source: "fallback",
  };

  const base = getApiBaseUrl();
  if (!isApiConfigured() || !base) return fallback;

  try {
    const headers = await getApiAuthHeaders();
    const res = await fetch(`${base}/openai/submission-review`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({
        submissionId: item.id,
        videoUrl: item.videoUrl,
        campaignTitle: item.campaign?.title,
        campaignDescription: item.campaign?.description,
        creatorName: item.creator?.name,
        creatorNiche: item.creator?.niche ?? item.campaign?.niche,
      }),
    });

    if (!res.ok) return fallback;

    const data = (await res.json()) as Partial<SubmissionReviewAi>;
    return {
      hookStrength: Number(data.hookStrength) || fallback.hookStrength,
      brandFit: Number(data.brandFit) || fallback.brandFit,
      clarity: Number(data.clarity) || fallback.clarity,
      ugcAuthenticity: Number(data.ugcAuthenticity) || fallback.ugcAuthenticity,
      conversionPotential: Number(data.conversionPotential) || fallback.conversionPotential,
      overallScore: Number(data.overallScore) || fallback.overallScore,
      aiNotes: String(data.aiNotes ?? fallback.aiNotes),
      recommendation:
        data.recommendation === "approve" || data.recommendation === "reject" || data.recommendation === "revise"
          ? data.recommendation
          : fallback.recommendation,
      strengths: Array.isArray(data.strengths) ? data.strengths.map(String) : fallback.strengths,
      improvements: Array.isArray(data.improvements) ? data.improvements.map(String) : fallback.improvements,
      source: "ai",
    };
  } catch {
    return fallback;
  }
}
