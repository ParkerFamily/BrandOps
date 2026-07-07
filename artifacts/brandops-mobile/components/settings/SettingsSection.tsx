import { Text, View, type ViewProps } from "react-native";
import { BrandOpsCard } from "@/components/ui/BrandOpsCard";
import { BrandOpsTheme } from "@/constants/brandopsTheme";

type Props = ViewProps & {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function SettingsSection({ title, description, children, style, ...rest }: Props) {
  return (
    <View style={[{ marginBottom: 18 }, style]} {...rest}>
      <Text
        style={{
          color: BrandOpsTheme.colors.lime,
          fontWeight: "800",
          fontSize: 11,
          letterSpacing: 0.8,
          marginBottom: description ? 4 : 10,
        }}
      >
        {title.toUpperCase()}
      </Text>
      {description ? (
        <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 12, marginBottom: 10 }}>{description}</Text>
      ) : null}
      <BrandOpsCard variant="soft" style={{ paddingVertical: 4 }}>
        {children}
      </BrandOpsCard>
    </View>
  );
}

export function SettingsDivider() {
  return <View style={{ height: 1, backgroundColor: BrandOpsTheme.colors.border, marginHorizontal: 4 }} />;
}
