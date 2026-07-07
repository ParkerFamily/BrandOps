import { getDownloadURL, ref } from "firebase/storage";
import { getFirebase } from "@/lib/firebase";

const DIRECT_VIDEO = /\.(mp4|mov|m4v|webm)(\?|$)/i;
const FIREBASE_STORAGE = /firebasestorage\.googleapis\.com/i;
const SOCIAL_HOST = /(tiktok\.com|instagram\.com|youtube\.com|youtu\.be|facebook\.com|twitter\.com|x\.com)/i;
const RESOLVE_TIMEOUT_MS = 12_000;

export type SubmissionPlayback = {
  uri: string | null;
  mode: "local" | "remote" | "link" | "missing";
  error?: string;
};

export function isSocialVideoLink(url: string): boolean {
  return SOCIAL_HOST.test(url);
}

export function looksLikeDirectVideo(url: string): boolean {
  return DIRECT_VIDEO.test(url) || FIREBASE_STORAGE.test(url);
}

function parseFirebaseStoragePath(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/o\/(.+)$/);
    if (!match?.[1]) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function freshDownloadUrl(storagePath: string): Promise<string> {
  const firebase = getFirebase();
  if (!firebase) throw new Error("Firebase is not configured.");
  return withTimeout(getDownloadURL(ref(firebase.storage, storagePath)), RESOLVE_TIMEOUT_MS, "Storage lookup");
}

/** Prefer the URL saved at upload time — instant playback, no full-file download. */
function playbackFromVideoUrl(videoUrl: string): SubmissionPlayback | null {
  if (!videoUrl) return null;
  if (isSocialVideoLink(videoUrl)) {
    return { uri: videoUrl, mode: "link" };
  }
  if (looksLikeDirectVideo(videoUrl)) {
    return { uri: videoUrl, mode: "remote" };
  }
  return { uri: videoUrl, mode: "link" };
}

export async function resolveSubmissionVideoPlayback(input: {
  videoUrl?: string | null;
  storagePath?: string | null;
  submissionType?: "upload" | "link";
}): Promise<SubmissionPlayback> {
  const videoUrl = input.videoUrl?.trim() ?? "";
  const storagePath = input.storagePath?.trim() ?? "";

  if (input.submissionType === "link" || (videoUrl && isSocialVideoLink(videoUrl))) {
    return { uri: videoUrl || null, mode: "link" };
  }

  const firebase = getFirebase();
  if (!firebase?.auth.currentUser) {
    const direct = playbackFromVideoUrl(videoUrl);
    if (direct) return direct;
    return { uri: null, mode: "missing", error: "Sign in to load this video." };
  }

  // Fast path — stream the Firebase URL we already stored on the submission doc.
  const direct = playbackFromVideoUrl(videoUrl);
  if (direct?.mode === "remote") {
    return direct;
  }

  const pathToResolve = storagePath || (videoUrl ? parseFirebaseStoragePath(videoUrl) : null);
  if (pathToResolve) {
    try {
      const uri = await freshDownloadUrl(pathToResolve);
      return { uri, mode: "remote" };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load video from storage.";
      if (videoUrl) {
        return playbackFromVideoUrl(videoUrl) ?? { uri: videoUrl, mode: "remote", error: message };
      }
      return { uri: null, mode: "missing", error: message };
    }
  }

  if (videoUrl) {
    return playbackFromVideoUrl(videoUrl) ?? { uri: videoUrl, mode: "link" };
  }

  return { uri: null, mode: "missing", error: "No video on this submission." };
}
