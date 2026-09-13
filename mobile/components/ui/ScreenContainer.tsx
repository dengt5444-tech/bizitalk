import React from "react";
import { ScrollView, type ScrollViewProps, View, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";

// Roughly mirrors the web app's `mx-auto max-w-* px-6 py-14` page shell —
// a single centered column with generous vertical breathing room.
export function ScreenScroll({ style, contentContainerStyle, ...rest }: ScrollViewProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[{ flex: 1, backgroundColor: theme.colors.paper }, style]}
      contentContainerStyle={[
        { paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
        contentContainerStyle,
      ]}
      {...rest}
    />
  );
}

export function ScreenView({ style, ...rest }: ViewProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: theme.colors.paper,
          paddingHorizontal: 20,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom,
        },
        style,
      ]}
      {...rest}
    />
  );
}
