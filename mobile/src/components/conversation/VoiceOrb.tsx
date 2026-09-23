import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { useColors } from "@/theme";

export type OrbState = "connecting" | "assistant" | "user" | "muted" | "idle";

// Ambient visual for a realtime voice call: a slowly breathing sphere that
// speeds up and changes color with who is talking (signal blue for the AI,
// amber for the learner) — same as the web app's VoiceOrb.
export function VoiceOrb({ state }: { state: OrbState }) {
  const colors = useColors();
  const [pulse] = useState(() => new Animated.Value(0));
  const active = state === "assistant" || state === "user";
  const duration = active ? 1100 : state === "connecting" ? 900 : 1900;

  useEffect(() => {
    pulse.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: duration / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: duration / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [duration, pulse]);

  const [c1, c2] = {
    assistant: [colors.signal, colors.signalDim],
    user: [colors.amber, colors.amberDim],
    muted: [colors.inkFaint, colors.line],
    connecting: [colors.signalDim, colors.ink],
    idle: [colors.signalDim, colors.ink],
  }[state];

  const coreScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, active ? 1.08 : 1.02] });
  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, active ? 1.25 : 1.08] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, active ? 0.35 : 0.2] });

  return (
    <View style={styles.wrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View
        style={[styles.glow, { backgroundColor: c1, opacity: glowOpacity, transform: [{ scale: glowScale }] }]}
      />
      <Animated.View style={{ transform: [{ scale: coreScale }] }}>
        <Svg width={120} height={120}>
          <Defs>
            <LinearGradient id="orb" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={c1} />
              <Stop offset="1" stopColor={c2} />
            </LinearGradient>
          </Defs>
          <Circle cx={60} cy={60} r={60} fill="url(#orb)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 180, height: 180, alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute", width: 170, height: 170, borderRadius: 85 },
});
