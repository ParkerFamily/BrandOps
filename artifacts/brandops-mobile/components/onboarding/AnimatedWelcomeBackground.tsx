import { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BrandOpsTheme } from "@/constants/brandopsTheme";

const { width, height } = Dimensions.get("window");

const PARTICLE_COUNT = 16;

function particleStyle(index: number) {
  const col = index % 4;
  const row = Math.floor(index / 4);
  return {
    left: width * (0.08 + col * 0.24 + (index % 3) * 0.02),
    top: height * (0.12 + row * 0.18 + (index % 5) * 0.015),
    size: 2 + (index % 3),
  };
}

export function AnimatedWelcomeBackground({ active = true }: { active?: boolean }) {
  const pulseA = useRef(new Animated.Value(0)).current;
  const pulseB = useRef(new Animated.Value(0)).current;
  const mesh = useRef(new Animated.Value(0)).current;
  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      drift: new Animated.Value(0),
      fade: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (!active) return;

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseA, { toValue: 1, duration: 3200, useNativeDriver: true }),
        Animated.timing(pulseA, { toValue: 0, duration: 3200, useNativeDriver: true }),
      ])
    );

    const pulseLoopB = Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(pulseB, { toValue: 1, duration: 3800, useNativeDriver: true }),
        Animated.timing(pulseB, { toValue: 0, duration: 3800, useNativeDriver: true }),
      ])
    );

    const meshLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(mesh, { toValue: 1, duration: 9000, useNativeDriver: true }),
        Animated.timing(mesh, { toValue: 0, duration: 9000, useNativeDriver: true }),
      ])
    );

    pulseLoop.start();
    pulseLoopB.start();
    meshLoop.start();

    const particleLoops = particles.map((p, i) => {
      const driftLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(p.drift, { toValue: 1, duration: 4200 + i * 180, useNativeDriver: true }),
          Animated.timing(p.drift, { toValue: 0, duration: 4200 + i * 180, useNativeDriver: true }),
        ])
      );
      const fadeLoop = Animated.loop(
        Animated.sequence([
          Animated.delay(i * 120),
          Animated.timing(p.fade, { toValue: 1, duration: 1800 + (i % 4) * 200, useNativeDriver: true }),
          Animated.timing(p.fade, { toValue: 0, duration: 1800 + (i % 4) * 200, useNativeDriver: true }),
        ])
      );
      driftLoop.start();
      fadeLoop.start();
      return () => {
        driftLoop.stop();
        fadeLoop.stop();
      };
    });

    return () => {
      pulseLoop.stop();
      pulseLoopB.stop();
      meshLoop.stop();
      particleLoops.forEach((stop) => stop());
    };
  }, [active, mesh, particles, pulseA, pulseB]);

  const scaleA = pulseA.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });
  const opacityA = pulseA.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.28] });
  const scaleB = pulseB.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const opacityB = pulseB.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.18] });
  const meshY = mesh.interpolate({ inputRange: [0, 1], outputRange: [0, -28] });
  const meshX = mesh.interpolate({ inputRange: [0, 1], outputRange: [0, 18] });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={["rgba(198,255,0,0.10)", "rgba(198,255,0,0.00)", "rgba(10,10,10,1)"]}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[
          styles.radial,
          {
            top: height * 0.02,
            left: width * 0.1,
            transform: [{ scale: scaleA }],
            opacity: opacityA,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.radial,
          styles.radialSecondary,
          {
            top: height * 0.28,
            right: -width * 0.15,
            transform: [{ scale: scaleB }],
            opacity: opacityB,
          },
        ]}
      />

      <Animated.View style={{ transform: [{ translateX: meshX }, { translateY: meshY }] }}>
        <LinearGradient
          colors={["rgba(198,255,0,0.06)", "transparent", "rgba(198,255,0,0.04)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.mesh, { top: height * 0.35, left: -width * 0.2 }]}
        />
      </Animated.View>

      {particles.map((p, i) => {
        const layout = particleStyle(i);
        const translateY = p.drift.interpolate({ inputRange: [0, 1], outputRange: [0, -22 - (i % 5) * 4] });
        const translateX = p.drift.interpolate({ inputRange: [0, 1], outputRange: [0, (i % 2 === 0 ? 1 : -1) * (6 + (i % 3))] });
        const opacity = p.fade.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.75] });

        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              left: layout.left,
              top: layout.top,
              width: layout.size,
              height: layout.size,
              borderRadius: layout.size,
              backgroundColor: BrandOpsTheme.colors.lime,
              opacity,
              transform: [{ translateY }, { translateX }],
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  radial: {
    position: "absolute",
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: width * 0.85,
    backgroundColor: BrandOpsTheme.colors.lime,
  },
  radialSecondary: {
    width: width * 0.65,
    height: width * 0.65,
    borderRadius: width * 0.65,
  },
  mesh: {
    position: "absolute",
    width: width * 1.4,
    height: height * 0.45,
    borderRadius: 40,
  },
});
