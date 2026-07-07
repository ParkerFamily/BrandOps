import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
  type UploadMetadata,
} from "firebase/storage";
import { getFirebase } from "@/lib/firebase";

export type UploadedSubmissionVideo = {
  downloadUrl: string;
  storagePath: string;
  contentType: string;
  fileName: string;
};

function extensionForMime(mimeType: string): string {
  if (mimeType.includes("quicktime")) return "mov";
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("m4v")) return "m4v";
  return "mp4";
}

/** React Native iOS — fetch() on photo-library URIs often fails; XHR is reliable. */
function readLocalVideoBlob(localUri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      const blob = xhr.response as Blob | null;
      if (xhr.status >= 200 && xhr.status < 300 && blob && blob.size > 0) {
        resolve(blob);
        return;
      }
      reject(new Error("Could not read the selected video file."));
    };
    xhr.onerror = () => reject(new Error("Could not read the selected video file."));
    xhr.onabort = () => reject(new Error("Video read was cancelled."));
    xhr.responseType = "blob";
    xhr.open("GET", localUri, true);
    xhr.send(null);
  });
}

function storageErrorMessage(err: unknown): string {
  const code = typeof err === "object" && err && "code" in err ? String((err as { code: string }).code) : "";
  if (code.includes("unauthorized") || code.includes("permission-denied")) {
    return "Storage permission denied. Sign in again, or ask support to deploy Firebase Storage rules.";
  }
  if (code.includes("unauthenticated")) {
    return "Sign in required before uploading.";
  }
  if (code.includes("quota-exceeded")) {
    return "Storage quota exceeded on the Firebase project.";
  }
  if (code.includes("canceled")) {
    return "Upload was cancelled.";
  }
  if (err instanceof Error && err.message) return err.message;
  return "Firebase Storage upload failed. Check your connection and try again.";
}

export async function uploadSubmissionVideo(
  localUri: string,
  campaignDocId: string,
  creatorUid: string,
  options?: { fileName?: string; mimeType?: string }
): Promise<UploadedSubmissionVideo> {
  const firebase = getFirebase();
  if (!firebase) {
    throw new Error("Configure Firebase Storage to upload videos from mobile.");
  }

  if (!firebase.auth.currentUser) {
    throw new Error("Sign in required before uploading.");
  }

  const mimeType = options?.mimeType ?? "video/mp4";
  const ext = extensionForMime(mimeType);
  const safeCampaign = campaignDocId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeCreator = creatorUid.replace(/[^a-zA-Z0-9_-]/g, "_");
  const baseName =
    options?.fileName?.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.[^.]+$/, "") ?? `clip-${Date.now()}`;
  const storagePath = `submissions/${safeCampaign}/${safeCreator}-${Date.now()}-${baseName}.${ext}`;

  let blob: Blob;
  try {
    blob = await readLocalVideoBlob(localUri);
  } catch (readErr) {
    throw new Error(readErr instanceof Error ? readErr.message : "Could not read the selected video file.");
  }

  if (blob.size > 500 * 1024 * 1024) {
    throw new Error("Video is too large (max 500 MB). Try a shorter clip or lower quality.");
  }

  const metadata: UploadMetadata = { contentType: mimeType };
  const storageRef = ref(firebase.storage, storagePath);

  try {
    await new Promise<void>((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, blob, metadata);
      task.on("state_changed", null, reject, () => resolve());
    });
    const downloadUrl = await getDownloadURL(storageRef);

    if (__DEV__) {
      console.log("[BrandOps upload] stored", storagePath, mimeType, `${Math.round(blob.size / 1024 / 1024)}MB`);
    }

    return { downloadUrl, storagePath, contentType: mimeType, fileName: `${baseName}.${ext}` };
  } catch (err) {
    throw new Error(storageErrorMessage(err));
  }
}
