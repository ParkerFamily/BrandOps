import { type PropsWithChildren } from "react";
import { View, type ViewProps } from "react-native";
import { BrandOpsTheme } from "@/constants/brandopsTheme";

type Variant = "default" | "elevated" | "soft" | "glass" | "hero";

type Props = PropsWithChildren<
  ViewProps & {
    variant?: Variant;
  }
>;

export function BrandOpsCard({ children, style, variant = "soft", ...rest }: Props) {
  const styles = getVariantStyle(variant);

  return (
    <View {...rest} style={[styles, style]}>
      {children}
    </View>
  );
}

function getVariantStyle(variant: Variant) {
  const base = {
    borderRadius: BrandOpsTheme.radius.lg,
    padding: BrandOpsTheme.spacing.md,
  };

  if (variant === "hero") {
    return {
      ...base,
      backgroundColor: BrandOpsTheme.colors.card2,
      borderWidth: 0,
      ...BrandOpsTheme.shadow.glow,
    };
  }

  if (variant === "glass") {
    return {
      ...base,
      backgroundColor: "rgba(255,255,255,0.03)",
      borderWidth: 0,
    };
  }

  if (variant === "soft") {
    return {
      ...base,
      backgroundColor: BrandOpsTheme.colors.surface,
      borderWidth: 0,
      ...BrandOpsTheme.shadow.soft,
    };
  }

  if (variant === "elevated") {
    return {
      ...base,
      backgroundColor: BrandOpsTheme.colors.card2,
      borderWidth: 0,
    };
  }

  return {
    ...base,
    backgroundColor: BrandOpsTheme.colors.card,
    borderWidth: 0,
  };
}
