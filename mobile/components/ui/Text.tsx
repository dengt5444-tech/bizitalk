import React from "react";
import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

type Weight = "regular" | "medium" | "semibold" | "bold" | "black";
type ColorToken =
  | "ink"
  | "inkSoft"
  | "inkFaint"
  | "signal"
  | "signalDim"
  | "amber"
  | "amberDim"
  | "rose"
  | "paper"
  | "mint"
  | "mintDim"
  | "violet"
  | "violetDim"
  | "blossom"
  | "blossomDim";

export type ThemedTextProps = RNTextProps & {
  variant?: "display" | "sans";
  weight?: Weight;
  size?: number;
  color?: ColorToken;
  eyebrow?: boolean;
};

// Mirrors how the web app composes type: `font-display` (Zen Old Mincho)
// for headings, `font-sans` (Noto Sans JP) for everything else, both driven
// by the same weight scale Tailwind exposes there.
export function Text({
  variant = "sans",
  weight = "regular",
  size = 15,
  color = "ink",
  eyebrow = false,
  style,
  children,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();
  const fontFamily = theme.fonts[variant][weight];

  return (
    <RNText
      style={[
        {
          fontFamily,
          fontSize: eyebrow ? 12 : size,
          color: theme.colors[color],
          letterSpacing: eyebrow ? 2.4 : undefined,
          textTransform: eyebrow ? "uppercase" : undefined,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}

export function Heading({
  level = 1,
  style,
  ...rest
}: ThemedTextProps & { level?: 1 | 2 | 3 | 4 }) {
  const sizes = { 1: 34, 2: 26, 3: 20, 4: 17 } as const;
  return (
    <Text
      variant="display"
      weight="semibold"
      size={sizes[level]}
      style={[{ letterSpacing: -0.3 }, style]}
      {...rest}
    />
  );
}
