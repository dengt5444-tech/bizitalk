import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme, type ViewStyle } from "react-native";
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
  // Material Design 3 style elevation: soft, layered shadows rather than
  // hard borders, for surfaces that benefit from feeling "raised" (vs.
  // flat bordered surfaces used for dense lists) — mirrors --shadow-card /
  // --shadow-elevated in src/app/globals.css.
  shadows: {
    card: ViewStyle;
    elevated: ViewStyle;
  };
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
      shadows: {
        card: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.35 : 0.08,
          shadowRadius: 12,
          elevation: 4,
        },
        elevated: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: isDark ? 0.5 : 0.16,
          shadowRadius: 24,
          elevation: 10,
        },
      },
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
