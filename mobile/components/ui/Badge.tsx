import React from "react";
import { View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "./Text";

type Accent = "signal" | "amber" | "rose" | "neutral";

export function Badge({ label, accent = "signal" }: { label: string; accent?: Accent }) {
  const theme = useTheme();

  const tint =
    accent === "amber"
      ? theme.colors.amberTint
      : accent === "rose"
        ? theme.colors.roseTint
        : accent === "neutral"
          ? theme.colors.paperDim
          : theme.colors.signalTint;

  const textColor =
    accent === "amber"
      ? theme.colors.amberDim
      : accent === "rose"
        ? theme.colors.rose
        : accent === "neutral"
          ? theme.colors.inkSoft
          : theme.colors.signalDim;

  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: tint,
      }}
    >
      <Text weight="semibold" size={11} style={{ color: textColor }}>
        {label}
      </Text>
    </View>
  );
}
