import { Text, View } from "react-native";
import { BrandOpsTheme } from "@/constants/brandopsTheme";

type Tone = "lime" | "muted" | "warning" | "success";

const TONE_STYLES: Record<Tone, { bg: string; text: string; border?: string }> = {
  lime: {
    bg: BrandOpsTheme.colors.limeSoft,
    text: BrandOpsTheme.colors.lime,
    border: "rgba(198,255,0,0.25)",
  },
  muted: {
    bg: "rgba(255,255,255,0.06)",
    text: BrandOpsTheme.colors.subtle,
  },
  warning: {
    bg: "rgba(255,201,77,0.12)",
    text: BrandOpsTheme.colors.warning,
    border: "rgba(255,201,77,0.25)",
  },
  success: {
    bg: "rgba(55,214,122,0.12)",
    text: BrandOpsTheme.colors.success,
    border: "rgba(55,214,122,0.25)",
  },
};

export function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  const palette = TONE_STYLES[tone];
  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: palette.bg,
        borderWidth: palette.border ? 1 : 0,
        borderColor: palette.border,
      }}
    >
      <Text style={{ color: palette.text, fontSize: 11, fontWeight: "900", letterSpacing: 0.3 }}>{label}</Text>
    </View>
  );
}
