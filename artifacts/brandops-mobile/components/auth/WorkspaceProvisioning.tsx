import { useEffect, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { H2, P } from "@/components/ui/BrandOpsText";

type Props = {
  steps: string[];
  active: boolean;
};

export function WorkspaceProvisioning({ steps, active }: Props) {
  const [index, setIndex] = useState(0);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [active, pulse]);

  useEffect(() => {
    if (!active) return;
    setIndex(0);
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      if (i < steps.length) setIndex(i);
    }, 650);
    return () => clearInterval(timer);
  }, [active, steps]);

  if (!active) return null;

  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.32] });

  return (
    <View
      style={{
        ...BrandOpsTheme.shadow.glow,
        position: "absolute",
        inset: 0,
        backgroundColor: "rgba(5,5,5,0.94)",
        zIndex: 50,
        justifyContent: "center",
        paddingHorizontal: 28,
      }}
    >
      <H2 style={{ marginBottom: 10 }}>Welcome to BrandOps</H2>
      <P style={{ marginBottom: 24 }}>Your AI workspace is almost ready.</P>

      <View style={{ gap: 12 }}>
        {steps.map((step, i) => (
          <View
            key={step}
            style={{
              padding: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: i === index ? "rgba(198,255,0,0.45)" : BrandOpsTheme.colors.border,
              backgroundColor: i <= index ? "rgba(198,255,0,0.08)" : "rgba(255,255,255,0.03)",
            }}
          >
            <Text style={{ color: i <= index ? BrandOpsTheme.colors.text : BrandOpsTheme.colors.subtle, fontWeight: "800" }}>
              {step}
            </Text>
          </View>
        ))}
      </View>

      <Animated.View
        style={{
          marginTop: 28,
          height: 8,
          borderRadius: 999,
          backgroundColor: BrandOpsTheme.colors.lime,
          opacity,
        }}
      />
    </View>
  );
}
