import { Text, type TextProps } from "react-native";
import { BrandOpsTheme } from "@/constants/brandopsTheme";

export function H1(props: TextProps) {
  return <Text {...props} style={[{ color: BrandOpsTheme.colors.text, fontSize: 28, fontWeight: "900" }, props.style]} />;
}

export function H2(props: TextProps) {
  return <Text {...props} style={[{ color: BrandOpsTheme.colors.text, fontSize: 18, fontWeight: "800" }, props.style]} />;
}

export function P(props: TextProps) {
  return <Text {...props} style={[{ color: BrandOpsTheme.colors.muted, fontSize: 13, lineHeight: 18 }, props.style]} />;
}

export function Label(props: TextProps) {
  return <Text {...props} style={[{ color: BrandOpsTheme.colors.subtle, fontSize: 12, fontWeight: "700" }, props.style]} />;
}

