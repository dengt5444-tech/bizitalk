import React from "react";
import { ActivityIndicator, Pressable, type PressableProps, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "./Text";

type Variant = "primary" | "secondary" | "ghost";

export type ButtonProps = PressableProps & {
  label: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
};

export function Button({
  label,
  variant = "primary",
  loading = false,
  fullWidth = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const backgroundColor =
    variant === "primary" ? theme.colors.signal : variant === "secondary" ? "transparent" : "transparent";
  const borderColor = variant === "ghost" ? "transparent" : theme.colors.line;
  const textColor = variant === "primary" ? theme.colors.paper : theme.colors.ink;

  return (
    <Pressable
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        {
          backgroundColor,
          borderColor: variant === "primary" ? backgroundColor : borderColor,
          opacity: isDisabled ? 0.5 : state.pressed ? 0.85 : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
        },
        typeof style === "function" ? style(state) : style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text weight="medium" size={15} style={{ color: textColor, textAlign: "center" }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
