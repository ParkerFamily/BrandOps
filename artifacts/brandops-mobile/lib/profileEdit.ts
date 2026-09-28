import { Alert, Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { updateProfile, type User } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebase } from "@/lib/firebase";

export type PickedImage = {
  uri: string;
  fileName: string;
  mimeType: string;
};

async function ensureLibraryPermission(): Promise<boolean> {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) return true;

  const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (requested.granted) return true;

  if (!requested.canAskAgain) {
    Alert.alert(
      "Photo library access needed",
      "Allow BrandOps to access your photos in Settings to update your profile picture.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => void Linking.openSettings() },
      ]
    );
  }

  return false;
}

export async function pickProfileImage(): Promise<PickedImage | null> {
  const allowed = await ensureLibraryPermission();
  if (!allowed) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]?.uri) return null;

  const asset = result.assets[0];
  const fileName = asset.fileName ?? `profile-${Date.now()}.jpg`;
  const mimeType = asset.mimeType ?? "image/jpeg";

  return {
    uri: asset.uri,
    fileName,
    mimeType,
  };
}

export async function uploadProfileImage(uid: string, image: PickedImage): Promise<string> {
  const firebase = getFirebase();
  if (!firebase) {
    throw new Error("Firebase is not configured");
  }

  const response = await fetch(image.uri);
  const blob = await response.blob();

  const extension = image.fileName.split(".").pop() ?? "jpg";
  const storagePath = `profiles/${uid}/avatar.${extension}`;
  const storageRef = ref(firebase.storage, storagePath);

  await uploadBytes(storageRef, blob, {
    contentType: image.mimeType,
  });

  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl;
}

export async function updateUserProfile(user: User, updates: { displayName?: string; photoURL?: string }): Promise<void> {
  await updateProfile(user, updates);
  await user.reload();
}

export async function updateProfilePicture(user: User, image: PickedImage): Promise<void> {
  const photoURL = await uploadProfileImage(user.uid, image);
  await updateUserProfile(user, { photoURL });
}

export async function updateDisplayName(user: User, displayName: string): Promise<void> {
  await updateUserProfile(user, { displayName });
}
