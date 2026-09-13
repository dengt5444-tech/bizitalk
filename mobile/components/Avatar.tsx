import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/theme/ThemeProvider";

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

export function Avatar({ name, size = "md" }: { name: string; size?: keyof typeof SIZES }) {
  const theme = useTheme();
  const palette = [
    { bg: theme.colors.signalTint, text: theme.colors.signalDim },
    { bg: theme.colors.amberTint, text: theme.colors.amberDim },
    { bg: theme.colors.roseTint, text: theme.colors.rose },
    { bg: theme.colors.paperDim, text: theme.colors.ink },
  ];
  const { bg, text } = palette[hashString(name) % palette.length];
  const dimension = SIZES[size];

  return (
    <View
      style={{
        width: dimension,
        height: dimension,
        borderRadius: dimension / 2,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text variant="display" weight="semibold" size={dimension * 0.36} style={{ color: text }}>
        {initialsFor(name)}
      </Text>
    </View>
  );
}
