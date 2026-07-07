import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BrandOpsTheme } from "@/constants/brandopsTheme";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  value?: string;
  badge?: string;
  onPress?: () => void;
  disabled?: boolean;
  showChevron?: boolean;
};

export function SettingsRow({
  icon,
  title,
  subtitle,
  value,
  badge,
  onPress,
  disabled,
  showChevron = true,
}: Props) {
  const content = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 4,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: BrandOpsTheme.colors.surface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={20} color={BrandOpsTheme.colors.lime} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "800", fontSize: 15 }}>{title}</Text>
        {subtitle ? (
          <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 12, marginTop: 2 }} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {badge ? (
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: "rgba(198,255,0,0.12)",
          }}
        >
          <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "800", fontSize: 10 }}>{badge}</Text>
        </View>
      ) : null}
      {value ? (
        <Text style={{ color: BrandOpsTheme.colors.muted, fontWeight: "700", fontSize: 12, maxWidth: 90 }} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {showChevron && onPress ? <Ionicons name="chevron-forward" size={18} color={BrandOpsTheme.colors.subtle} /> : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} disabled={disabled}>
      {({ pressed }) => <View style={{ opacity: pressed ? 0.85 : 1 }}>{content}</View>}
    </Pressable>
  );
}
