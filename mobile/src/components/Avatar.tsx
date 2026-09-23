import { StyleSheet, View } from "react-native";
import { fonts, useColors } from "@/theme";
import { Text } from "./ui";

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SIZES = { sm: 32, md: 44, lg: 56 } as const;

// Same deterministic initials avatar as the web app: a persona always gets
// the same color on both.
export function Avatar({ name, size = "md" }: { name: string; size?: keyof typeof SIZES }) {
  const colors = useColors();
  const palette = [
    [colors.signalTint, colors.signalDim],
    [colors.amberTint, colors.amberDim],
    [colors.mintTint, colors.mintDim],
    [colors.violetTint, colors.violetDim],
    [colors.blossomTint, colors.blossomDim],
    [colors.roseTint, colors.rose],
  ] as const;
  const [bg, fg] = palette[hashString(name) % palette.length];
  const dimension = SIZES[size];

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.avatar, { width: dimension, height: dimension, backgroundColor: bg }]}
    >
      <Text style={{ color: fg, fontFamily: fonts.display, fontWeight: "600", fontSize: dimension * 0.34 }}>
        {initialsFor(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { borderRadius: 999, alignItems: "center", justifyContent: "center" },
});
