import { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { Label } from "@/components/ui/BrandOpsText";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function PulseChart({ values, label }: { values: number[]; label: string }) {
  const max = Math.max(...values, 1);
  const anims = useRef(values.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(
      60,
      anims.map((a, i) =>
        Animated.spring(a, {
          toValue: values[i]! / max,
          friction: 8,
          tension: 60,
          useNativeDriver: false,
        })
      )
    ).start();
  }, [anims, max, values]);

  return (
    <View>
      <Label style={{ color: BrandOpsTheme.colors.subtle, marginBottom: 12 }}>{label}</Label>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, height: 72 }}>
        {values.map((v, i) => {
          const h = anims[i]!.interpolate({ inputRange: [0, 1], outputRange: [8, 64] });
          return (
            <View key={i} style={{ flex: 1, alignItems: "center" }}>
              <Animated.View
                style={{
                  width: "100%",
                  height: h,
                  borderRadius: 8,
                  backgroundColor: i === values.length - 1 ? BrandOpsTheme.colors.lime : "rgba(198,255,0,0.35)",
                }}
              />
              <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 10, marginTop: 6, fontWeight: "700" }}>
                {DAYS[i]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
