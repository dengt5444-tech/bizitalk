import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { radius, useColors, type ThemeColors } from "@/theme";

type Tone = "surface" | "paperDim" | "signalTint" | "amberTint" | "mintTint" | "violetTint" | "ink";

export function Card({
  children,
  tone = "surface",
  padded = true,
  onPress,
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  tone?: Tone;
  padded?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const colors = useColors();
  const bg = colors[tone as keyof ThemeColors];
  const base = [
    styles.card,
    { backgroundColor: bg, shadowColor: colors.shadow },
    tone !== "surface" && tone !== "ink" && styles.flat,
    padded && styles.padded,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [...base, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={base}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  flat: { shadowOpacity: 0, elevation: 0 },
  padded: { padding: 20 },
});
