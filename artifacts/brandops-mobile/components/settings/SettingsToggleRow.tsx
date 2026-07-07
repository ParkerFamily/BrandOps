import { Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BrandOpsTheme } from "@/constants/brandopsTheme";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
};

export function SettingsToggleRow({ icon, title, subtitle, value, onValueChange, disabled }: Props) {
  return (
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
          <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 12, marginTop: 2 }}>{subtitle}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: "rgba(255,255,255,0.12)", true: "rgba(198,255,0,0.35)" }}
        thumbColor={value ? BrandOpsTheme.colors.lime : "#f4f4f5"}
      />
    </View>
  );
}
