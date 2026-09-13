import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { darkColors, lightColors, type HarborColors } from "./colors";
import { display, sans } from "./fonts";

export type Theme = {
  colors: HarborColors;
  scheme: "light" | "dark";
  fonts: {
    display: typeof display;
    sans: typeof sans;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    full: number;
  };
  spacing: (n: number) => number;
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const theme = useMemo<Theme>(
    () => ({
      colors: isDark ? darkColors : lightColors,
      scheme: isDark ? "dark" : "light",
      fonts: { display, sans },
      radius: { sm: 8, md: 16, lg: 24, full: 999 },
      spacing: (n: number) => n * 4,
    }),
    [isDark],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
