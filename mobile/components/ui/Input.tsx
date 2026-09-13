import React from "react";
import { TextInput, type TextInputProps } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

export function Input({ style, ...rest }: TextInputProps) {
  const theme = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.colors.inkFaint}
      style={[
        {
          borderWidth: 1,
          borderColor: theme.colors.line,
          backgroundColor: theme.colors.paper,
          borderRadius: theme.radius.sm,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 15,
          color: theme.colors.ink,
          fontFamily: theme.fonts.sans.regular,
        },
        style,
      ]}
      {...rest}
    />
  );
}
