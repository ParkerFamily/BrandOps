import { Pressable, Text, type PressableProps, ActivityIndicator, View } from "react-native";
import { BrandOpsTheme } from "@/constants/brandopsTheme";

type Props = PressableProps & {
  label: string;
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function BrandOpsButton({ label, loading, variant = "primary", disabled, ...rest }: Props) {
  const isDisabled = Boolean(disabled || loading);

  const styles = getStyles(variant, isDisabled);

  return (
    <Pressable disabled={isDisabled} {...rest}>
      {({ pressed }) => (
        <View style={[styles.container, { opacity: isDisabled ? 0.6 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
          {variant === "primary" ? (
            <View pointerEvents="none" style={[styles.glow, { opacity: pressed ? 0.22 : 0.16 }]} />
          ) : null}

          {loading ? <ActivityIndicator color={styles.text.color as string} /> : <Text style={styles.text}>{label}</Text>}
        </View>
      )}
    </Pressable>
  );
}

function getStyles(variant: Props["variant"], disabled: boolean) {
  const base = {
    height: 48,
    borderRadius: BrandOpsTheme.radius.lg,
    paddingHorizontal: BrandOpsTheme.spacing.lg,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexDirection: "row" as const,
    gap: 10,
    borderWidth: 1,
  };

  if (variant === "secondary") {
    return {
      container: { ...base, backgroundColor: BrandOpsTheme.colors.card, borderColor: BrandOpsTheme.colors.borderStrong },
      text: { color: BrandOpsTheme.colors.text, fontWeight: "700" as const },
      glow: { display: "none" as const },
    };
  }

  if (variant === "ghost") {
    return {
      container: { ...base, backgroundColor: "transparent", borderColor: "transparent" },
      text: { color: BrandOpsTheme.colors.muted, fontWeight: "700" as const },
      glow: { display: "none" as const },
    };
  }

  if (variant === "danger") {
    return {
      container: { ...base, backgroundColor: "rgba(255,77,77,0.14)", borderColor: "rgba(255,77,77,0.30)" },
      text: { color: BrandOpsTheme.colors.text, fontWeight: "700" as const },
      glow: { display: "none" as const },
    };
  }

  // primary
  return {
    container: { ...base, backgroundColor: BrandOpsTheme.colors.lime, borderColor: "rgba(198,255,0,0.55)" },
    text: { color: "#0A0A0A", fontWeight: "900" as const, letterSpacing: 0.2 },
    glow: {
      position: "absolute" as const,
      inset: -10,
      borderRadius: BrandOpsTheme.radius.lg + 10,
      backgroundColor: BrandOpsTheme.colors.lime,
      opacity: disabled ? 0 : 0.16,
      blurRadius: 18,
    },
  };
}

