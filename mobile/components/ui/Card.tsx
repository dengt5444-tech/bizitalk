import React from "react";
import { Pressable, type PressableProps, View, type ViewProps } from "react-native";
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

export function PressableCard({ style, ...rest }: PressableProps) {
  const theme = useTheme();
  return (
    <Pressable
      style={(state) => [
        {
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.colors.line,
          backgroundColor: theme.colors.surface,
          padding: theme.spacing(6),
          opacity: state.pressed ? 0.8 : 1,
        },
        typeof style === "function" ? style(state) : style,
      ]}
      {...rest}
    />
  );
}
