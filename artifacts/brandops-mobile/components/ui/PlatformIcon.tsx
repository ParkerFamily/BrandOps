import { Ionicons } from "@expo/vector-icons";
import { BrandOpsTheme } from "@/constants/brandopsTheme";

export function PlatformIcon({ platform, size = 16 }: { platform: string; size?: number }) {
  const name =
    platform === "tiktok"
      ? "logo-tiktok"
      : platform === "instagram"
        ? "logo-instagram"
        : platform === "youtube"
          ? "logo-youtube"
          : "megaphone-outline";

  return <Ionicons name={name as keyof typeof Ionicons.glyphMap} size={size} color={BrandOpsTheme.colors.lime} />;
}
