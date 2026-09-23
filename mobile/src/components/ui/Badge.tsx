import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { radius, useColors } from "@/theme";
import { Text } from "./Text";

type Tone = "signal" | "amber" | "mint" | "violet" | "neutral" | "rose" | "surface";

export function Badge({ label, tone = "neutral", icon }: { label: string; tone?: Tone; icon?: ReactNode }) {
  const colors = useColors();
  const palette = {
    signal: { bg: colors.signalTint, fg: colors.signalDim },
    amber: { bg: colors.amberTint, fg: colors.amberDim },
    mint: { bg: colors.mintTint, fg: colors.mintDim },
    violet: { bg: colors.violetTint, fg: colors.violetDim },
    rose: { bg: colors.roseTint, fg: colors.rose },
    neutral: { bg: colors.paperDim, fg: colors.inkFaint },
    surface: { bg: colors.surface, fg: colors.ink },
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      {icon}
      <Text variant="caption" weight="600" style={{ color: palette.fg }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
