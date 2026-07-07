import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BrandOpsTheme } from "@/constants/brandopsTheme";

type Props = {
  size?: number;
  iconSize?: number;
};

/** Neutral UGC campaign thumbnail — no social platform branding. */
export function CampaignThumb({ size = 72, iconSize = 28 }: Props) {
  return (
    <LinearGradient
      colors={["rgba(198,255,0,0.25)", "rgba(198,255,0,0.05)"]}
      style={{
        width: size,
        height: size >= 72 ? 88 : size,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name="videocam" size={iconSize} color={BrandOpsTheme.colors.lime} />
    </LinearGradient>
  );
}
