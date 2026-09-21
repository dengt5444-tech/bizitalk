import React from "react";
import { Pressable, type GestureResponderEvent, type PressableProps, View, type ViewProps } from "react-native";
import { haptics } from "@/lib/haptics";
import { useTheme } from "@/theme/ThemeProvider";

// Material Design 3 style: a soft, layered shadow reads as "raised"
// without needing a hard border — mirrors the web app's shift from
// bordered flat cards to elevated ones (shadow-card in globals.css).
export function Card({ style, ...rest }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.surface,
          padding: theme.spacing(6),
        },
        theme.shadows.card,
        style,
      ]}
      {...rest}
    />
  );
}

export function PressableCard({ style, onPress, ...rest }: PressableProps) {
  const theme = useTheme();

  function handlePress(event: GestureResponderEvent) {
    haptics.selection();
    onPress?.(event);
  }

  return (
    <Pressable
      onPress={onPress ? handlePress : undefined}
      style={(state) => [
        {
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.surface,
          padding: theme.spacing(6),
          opacity: state.pressed ? 0.85 : 1,
          transform: [{ scale: state.pressed ? 0.98 : 1 }],
        },
        theme.shadows.card,
        typeof style === "function" ? style(state) : style,
      ]}
      {...rest}
    />
  );
}
