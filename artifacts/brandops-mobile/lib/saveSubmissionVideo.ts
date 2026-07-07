import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { resolveSubmissionVideoPlayback } from "@/lib/resolveSubmissionVideoPlayback";

function safeFileStem(name: string): string {
  const stem = name.replace(/[^a-zA-Z0-9-_]+/g, "_").replace(/^_+|_+$/g, "");
  return (stem || "brandops-submission").slice(0, 64);
}

export async function saveSubmissionVideoToDevice(input: {
  videoUrl?: string | null;
  storagePath?: string | null;
  submissionType?: "upload" | "link";
  fileName?: string;
}): Promise<void> {
  const playback = await resolveSubmissionVideoPlayback(input);
  if (playback.mode === "link" || !playback.uri) {
    throw new Error("This submission is an external link. Open it in the browser to download.");
  }

  const permission = await MediaLibrary.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Allow photo library access to save videos to your device.");
  }

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error("Device storage is not available.");
  }

  const localPath = `${cacheDir}${safeFileStem(input.fileName ?? "brandops-submission")}-${Date.now()}.mp4`;
  const download = await FileSystem.downloadAsync(playback.uri, localPath);
  if (download.status !== 200) {
    throw new Error(`Download failed (${download.status}).`);
  }

  await MediaLibrary.createAssetAsync(download.uri);
  await FileSystem.deleteAsync(download.uri, { idempotent: true });
}
