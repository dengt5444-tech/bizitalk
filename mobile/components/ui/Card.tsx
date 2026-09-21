import React from "react";
import { Pressable, type GestureResponderEvent, type PressableProps, View, type ViewProps } from "react-native";
import { haptics } from "@/lib/haptics";
import { useTheme } from "@/theme/ThemeProvider";

export function Card({ style, ...rest }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.colors.line,
          backgroundColor: theme.colors.surface,
          padding: theme.spacing(6),
        },
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
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.colors.line,
          backgroundColor: theme.colors.surface,
          padding: theme.spacing(6),
          opacity: state.pressed ? 0.8 : 1,
          transform: [{ scale: state.pressed ? 0.98 : 1 }],
        },
        typeof style === "function" ? style(state) : style,
      ]}
      {...rest}
    />
  );
}
