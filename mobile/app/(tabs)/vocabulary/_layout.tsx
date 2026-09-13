import { Stack } from "expo-router";
import React from "react";
import { useTheme } from "@/theme/ThemeProvider";

export default function VocabularyLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.paper },
        headerTintColor: theme.colors.ink,
        headerTitleStyle: { fontFamily: theme.fonts.display.semibold },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.colors.paper },
      }}
    >
      <Stack.Screen name="index" options={{ title: "単語帳" }} />
    </Stack>
  );
}
