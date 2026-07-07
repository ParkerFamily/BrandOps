import { Alert, Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";

export type PickedVideo = {
  uri: string;
  fileName: string;
  mimeType: string;
  durationMs: number | null;
};

async function ensureLibraryPermission(): Promise<boolean> {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) return true;

  const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (requested.granted) return true;

  if (!requested.canAskAgain) {
    Alert.alert(
      "Photo library access needed",
      "Allow BrandOps to access your videos in Settings to upload UGC.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => void Linking.openSettings() },
      ]
    );
  }

  return false;
}

function inferMimeType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".m4v")) return "video/x-m4v";
  if (lower.endsWith(".webm")) return "video/webm";
  return "video/mp4";
}

/** Open the device photo library and return a selected video asset. */
export async function pickVideoFromLibrary(): Promise<PickedVideo | null> {
  const allowed = await ensureLibraryPermission();
  if (!allowed) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["videos"],
    allowsEditing: false,
    quality: 1,
    videoQuality: ImagePicker.UIImagePickerControllerQualityType.High,
    // Keep the camera-roll master when possible — "Compatible" transcodes HDR and can look washed out.
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]?.uri) return null;

  const asset = result.assets[0];
  const fileName = asset.fileName ?? `submission-${Date.now()}.mp4`;
  const mimeType = asset.mimeType ?? inferMimeType(fileName);

  if (__DEV__) {
    console.log("[BrandOps upload] picked video", fileName, mimeType, asset.uri.slice(0, 48));
  }

  return {
    uri: asset.uri,
    fileName,
    mimeType,
    durationMs: asset.duration ?? null,
  };
}

/** Optional: record a new video with the camera. */
export async function recordSubmissionVideo(): Promise<PickedVideo | null> {
  const cam = await ImagePicker.requestCameraPermissionsAsync();
  if (!cam.granted) {
    Alert.alert("Camera access needed", "Allow camera access to record a UGC video.", [
      { text: "Cancel", style: "cancel" },
      { text: "Open Settings", onPress: () => void Linking.openSettings() },
    ]);
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["videos"],
    allowsEditing: false,
    quality: 1,
    videoQuality: ImagePicker.UIImagePickerControllerQualityType.High,
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]?.uri) return null;

  const asset = result.assets[0];
  const fileName = asset.fileName ?? `recording-${Date.now()}.mov`;
  return {
    uri: asset.uri,
    fileName,
    mimeType: asset.mimeType ?? inferMimeType(fileName),
    durationMs: asset.duration ?? null,
  };
}

export function showVideoSourcePicker(onPick: (source: "library" | "camera") => void) {
  Alert.alert("Add your video", "Choose where to get your UGC clip.", [
    { text: "Photo library", onPress: () => onPick("library") },
    { text: "Record video", onPress: () => onPick("camera") },
    { text: "Cancel", style: "cancel" },
  ]);
}
