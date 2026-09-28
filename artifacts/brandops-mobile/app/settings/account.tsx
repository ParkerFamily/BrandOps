import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { BrandOpsScreen } from "@/components/ui/BrandOpsScreen";
import { BrandOpsButton } from "@/components/ui/BrandOpsButton";
import { Avatar } from "@/components/ui/Avatar";
import { SettingsDivider, SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { useAuth } from "@/contexts/AuthContext";
import { canReviewSubmissions } from "@/lib/roleExperience";
import { openAuthenticatedWebSession } from "@/lib/webHandoff";
import { getFirebase } from "@/lib/firebase";
import { pickProfileImage, updateProfilePicture, updateDisplayName } from "@/lib/profileEdit";
import { BrandOpsTheme } from "@/constants/brandopsTheme";

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { user, authEmail, role, refreshProfile } = useAuth();
  const isBrand = canReviewSubmissions(role);
  const [uploading, setUploading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");

  const handleUpdateProfilePicture = async () => {
    const firebase = getFirebase();
    const currentUser = firebase?.auth.currentUser;
    if (!currentUser) {
      Toast.show({ type: "error", text1: "Not signed in", text2: "Sign in to update your profile picture." });
      return;
    }

    try {
      setUploading(true);
      const image = await pickProfileImage();
      if (!image) return;

      await updateProfilePicture(currentUser, image);
      await refreshProfile();
      Toast.show({ type: "success", text1: "Profile picture updated" });
    } catch (error) {
      console.error("Failed to update profile picture:", error);
      Toast.show({
        type: "error",
        text1: "Update failed",
        text2: error instanceof Error ? error.message : "Could not update profile picture",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateDisplayName = async () => {
    const firebase = getFirebase();
    const currentUser = firebase?.auth.currentUser;
    if (!currentUser) {
      Toast.show({ type: "error", text1: "Not signed in", text2: "Sign in to update your display name." });
      return;
    }

    const trimmed = displayName.trim();
    if (!trimmed) {
      Toast.show({ type: "error", text1: "Name required", text2: "Please enter a display name." });
      return;
    }

    try {
      await updateDisplayName(currentUser, trimmed);
      await refreshProfile();
      setEditingName(false);
      Toast.show({ type: "success", text1: "Display name updated" });
    } catch (error) {
      console.error("Failed to update display name:", error);
      Toast.show({
        type: "error",
        text1: "Update failed",
        text2: error instanceof Error ? error.message : "Could not update display name",
      });
    }
  };

  const showEditNameDialog = () => {
    setDisplayName(user?.displayName ?? "");
    setEditingName(true);
  };

  return (
    <BrandOpsScreen scroll tabBarInset={false}>
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        <Pressable onPress={handleUpdateProfilePicture} disabled={uploading}>
          <View>
            <Avatar
              name={user?.displayName ?? authEmail ?? "User"}
              photoUrl={user?.photoURL}
              size={72}
            />
            {uploading ? (
              <View
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: BrandOpsTheme.colors.lime,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: BrandOpsTheme.colors.background,
                }}
              >
                <Text style={{ fontSize: 10 }}>⏳</Text>
              </View>
            ) : (
              <View
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: BrandOpsTheme.colors.lime,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: BrandOpsTheme.colors.background,
                }}
              >
                <Ionicons name="camera" size={14} color={BrandOpsTheme.colors.text} />
              </View>
            )}
          </View>
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, gap: 8 }}>
          {editingName ? (
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Display name"
                placeholderTextColor={BrandOpsTheme.colors.subtle}
                style={{
                  color: BrandOpsTheme.colors.text,
                  fontWeight: "900",
                  fontSize: 20,
                  backgroundColor: BrandOpsTheme.colors.surface,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  minWidth: 200,
                }}
                autoFocus
              />
              <Pressable onPress={handleUpdateDisplayName}>
                <Ionicons name="checkmark-circle" size={28} color={BrandOpsTheme.colors.lime} />
              </Pressable>
              <Pressable onPress={() => setEditingName(false)}>
                <Ionicons name="close-circle" size={28} color={BrandOpsTheme.colors.danger} />
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 20 }}>
                {user?.displayName ?? "Your profile"}
              </Text>
              <Pressable onPress={showEditNameDialog}>
                <Ionicons name="pencil" size={16} color={BrandOpsTheme.colors.lime} />
              </Pressable>
            </>
          )}
        </View>
        <Text style={{ color: BrandOpsTheme.colors.subtle, marginTop: 4 }}>{authEmail}</Text>
      </View>

      <SettingsSection title="Account">
        <SettingsRow
          icon="person-outline"
          title="Profile"
          subtitle="Photo, display name, and workspace identity"
          onPress={() => router.replace("/(tabs)/profile" as never)}
        />
        <SettingsDivider />
        <SettingsRow
          icon="business-outline"
          title="Business information"
          subtitle={isBrand ? "Company name, website, and brand details" : "Creator profile and portfolio links"}
          onPress={() => void openAuthenticatedWebSession("settings")}
        />
        {isBrand ? (
          <>
            <SettingsDivider />
            <SettingsRow
              icon="document-text-outline"
              title="Company details"
              subtitle="Legal entity, address, and tax info"
              onPress={() => void openAuthenticatedWebSession("settings")}
            />
            <SettingsDivider />
            <SettingsRow
              icon="people-outline"
              title="Team members"
              subtitle="Invite teammates and manage roles"
              onPress={() => void openAuthenticatedWebSession("team")}
            />
          </>
        ) : null}
      </SettingsSection>
    </BrandOpsScreen>
  );
}
