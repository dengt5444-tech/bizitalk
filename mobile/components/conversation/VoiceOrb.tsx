import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { Animated, View } from "react-native";
import { useTheme, type Theme } from "@/theme/ThemeProvider";

// Ambient, full-screen visual for a realtime voice call — the audio itself
// carries the conversation, so this is deliberately not information-dense:
// a slowly breathing sphere that speeds up and swaps color depending on who
// is talking, in Harbor's own palette (signal blue for the AI, amber for
// the user — the same two colors ConversationRoom already used for the
// "話しています.../聞いています..." status text).
export type OrbState = "connecting" | "assistant" | "user" | "muted" | "idle";

const SIZE = 220;

function orbColors(theme: Theme, state: OrbState): [string, string] {
  switch (state) {
    case "assistant":
      return [theme.colors.signal, theme.colors.signalDim];
    case "user":
      return [theme.colors.amber, theme.colors.amberDim];
    case "muted":
      return [theme.colors.inkFaint, theme.colors.line];
    case "connecting":
    case "idle":
    default:
      return [theme.colors.signalDim, theme.colors.ink];
  }
}

export function VoiceOrb({ state }: { state: OrbState }) {
  const theme = useTheme();
  const [pulse] = useState(() => new Animated.Value(0));
  const [spin] = useState(() => new Animated.Value(0));
  const active = state === "assistant" || state === "user";

  useEffect(() => {
    const duration = active ? 1100 : state === "connecting" ? 900 : 1900;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, active, state]);

  useEffect(() => {
    spin.setValue(0);
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 16000, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: active ? [0.94, 1.07] : [0.97, 1.02] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: active ? [0.3, 0.6] : [0.18, 0.3] });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  const [c1, c2] = orbColors(theme, state);

  return (
    <View style={{ width: SIZE * 1.4, height: SIZE * 1.4, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          width: SIZE * 1.4,
          height: SIZE * 1.4,
          borderRadius: (SIZE * 1.4) / 2,
          backgroundColor: c1,
          opacity: glowOpacity,
          transform: [{ scale }],
        }}
      />
      <Animated.View
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          overflow: "hidden",
          transform: [{ scale }],
        }}
      >
        <LinearGradient colors={[c1, c2]} start={{ x: 0.15, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ flex: 1 }} />
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -SIZE * 0.3,
            left: -SIZE * 0.3,
            width: SIZE * 1.6,
            height: SIZE * 1.6,
            borderRadius: (SIZE * 1.6) / 2,
            backgroundColor: theme.colors.paper,
            opacity: 0.12,
            transform: [{ rotate }, { translateX: SIZE * 0.35 }],
          }}
        />
      </Animated.View>
    </View>
  );
}
