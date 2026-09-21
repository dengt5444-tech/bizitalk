import React from "react";
import { View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "./Text";

type Accent = "signal" | "amber" | "rose" | "neutral" | "violet" | "mint";

export function Badge({
  label,
  accent = "signal",
  icon,
}: {
  label: string;
  accent?: Accent;
  icon?: React.ReactNode;
}) {
  const theme = useTheme();

  const tint =
    accent === "amber"
      ? theme.colors.amberTint
      : accent === "rose"
        ? theme.colors.roseTint
        : accent === "neutral"
          ? theme.colors.paperDim
          : accent === "violet"
            ? theme.colors.violetTint
            : accent === "mint"
              ? theme.colors.mintTint
              : theme.colors.signalTint;

  const textColor =
    accent === "amber"
      ? theme.colors.amberDim
      : accent === "rose"
        ? theme.colors.rose
        : accent === "neutral"
          ? theme.colors.inkSoft
          : accent === "violet"
            ? theme.colors.violetDim
            : accent === "mint"
              ? theme.colors.mintDim
              : theme.colors.signalDim;

  return (
    <View
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: tint,
      }}
    >
      {icon}
      <Text weight="semibold" size={11} style={{ color: textColor }}>
        {label}
      </Text>
    </View>
  );
}
