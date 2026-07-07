import { getApiAuthHeaders, getApiBaseUrl, isApiConfigured } from "@/lib/apiClient";

export type VideoProcessingStatus = "idle" | "processing" | "done" | "error";

export function normalizeProcessingStatus(value: unknown): VideoProcessingStatus {
  if (value === "processing" || value === "done" || value === "error") return value;
  return "idle";
}

export async function startVideoEnhancement(input: {
  submissionId: string;
  videoUrl: string;
  campaignTitle?: string;
  brandName?: string;
  ctaText?: string;
}): Promise<void> {
  if (!isApiConfigured()) {
    throw new Error("API is not configured. Set EXPO_PUBLIC_API_BASE_URL.");
  }

  const base = getApiBaseUrl();
  if (!base) throw new Error("API is not configured.");

  const headers = await getApiAuthHeaders();
  const res = await fetch(`${base}/video/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      submissionId: input.submissionId,
      videoUrl: input.videoUrl,
      campaignTitle: input.campaignTitle ?? "",
      brandName: input.brandName ?? input.campaignTitle ?? "BrandOps",
      ctaText: input.ctaText ?? "Learn More",
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to start video processing");
  }
}

export async function approveSubmissionVideoChoice(input: {
  submissionId: string;
  choice: "processed" | "original";
}): Promise<{ videoUrl: string }> {
  if (!isApiConfigured()) {
    throw new Error("API is not configured.");
  }

  const base = getApiBaseUrl();
  if (!base) throw new Error("API is not configured.");

  const headers = await getApiAuthHeaders();
  const res = await fetch(`${base}/video/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      submissionId: input.submissionId,
      choice: input.choice,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to save video choice");
  }

  const data = (await res.json()) as { videoUrl?: string };
  return { videoUrl: data.videoUrl ?? "" };
}
