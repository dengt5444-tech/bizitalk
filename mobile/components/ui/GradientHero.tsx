import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { View, type ViewProps } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

// Mirrors the web homepage's dark hero band (bg-black + a soft radial
// signal-colored glow) using a diagonal gradient plus a blurred-looking
// accent circle, since React Native has no radial-gradient primitive.
export function GradientHero({ style, children, ...rest }: ViewProps) {
  const theme = useTheme();

  return (
    <View style={[{ borderRadius: theme.radius.lg, overflow: "hidden" }, style]} {...rest}>
      <LinearGradient
        colors={[theme.colors.ink, theme.colors.signalDim]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -60,
          right: -60,
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: theme.colors.signal,
          opacity: 0.25,
        }}
      />
      <View style={{ padding: 28, gap: 16 }}>{children}</View>
    </View>
  );
}
