import { Stack } from "expo-router";
import React from "react";
import { useTheme } from "@/theme/ThemeProvider";

export default function ConversationLayout() {
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
      <Stack.Screen name="index" options={{ title: "AI会話" }} />
      <Stack.Screen name="[slug]" options={{ title: "" }} />
      <Stack.Screen name="history/index" options={{ title: "会話の記録" }} />
      <Stack.Screen name="history/[id]" options={{ title: "" }} />
    </Stack>
  );
}
