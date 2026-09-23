import { Platform, useColorScheme } from "react-native";
import { darkColors, lightColors, type ThemeColors } from "./colors";

export type { ThemeColors };

export function useColors(): ThemeColors {
  return useColorScheme() === "dark" ? darkColors : lightColors;
}

// The web app pairs a Mincho display face (Zen Old Mincho) with a sans body
// face. iOS ships Hiragino Mincho, which gives the same feel without
// bundling a multi-megabyte Japanese web font into the app.
export const fonts = {
  display: Platform.select({ ios: "Hiragino Mincho ProN", default: "serif" }),
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 24,
  pill: 999,
};
