import { Text, View } from "react-native";
import { BrandOpsTheme } from "@/constants/brandopsTheme";

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: BrandOpsTheme.colors.limeSoft,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "900", fontSize: size * 0.38 }}>{initial}</Text>
    </View>
  );
}

export function AvatarStack({ names, max = 4 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max);
  return (
    <View style={{ flexDirection: "row" }}>
      {shown.map((name, i) => (
        <View key={name} style={{ marginLeft: i === 0 ? 0 : -10, zIndex: max - i }}>
          <View style={{ borderWidth: 2, borderColor: BrandOpsTheme.colors.bg, borderRadius: 99 }}>
            <Avatar name={name} size={32} />
          </View>
        </View>
      ))}
    </View>
  );
}
