import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { radius, useColors } from "@/theme";
import { Text } from "./Text";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  icon,
  style,
  accessibilityLabel,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const colors = useColors();
  const inactive = disabled || loading;

  const palette = {
    primary: { bg: colors.signal, fg: colors.onSignal, border: colors.signal },
    secondary: { bg: colors.surface, fg: colors.ink, border: colors.surface },
    outline: { bg: "transparent", fg: colors.ink, border: colors.line },
    ghost: { bg: "transparent", fg: colors.signal, border: "transparent" },
    danger: { bg: "transparent", fg: colors.rose, border: colors.rose },
  }[variant];

  const padding = { sm: { v: 8, h: 14 }, md: { v: 13, h: 20 }, lg: { v: 16, h: 26 } }[size];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={() => {
        if (variant === "primary") Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          paddingVertical: padding.v,
          paddingHorizontal: padding.h,
          opacity: inactive ? 0.5 : pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        variant === "secondary" && styles.raised,
        variant === "secondary" && { shadowColor: colors.shadow },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text
            variant={size === "sm" ? "small" : "body"}
            weight="600"
            style={{ color: palette.fg }}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  raised: {
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
});
