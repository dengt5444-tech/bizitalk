import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useCallback } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/context/AuthProvider";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";
import { useHarborFonts } from "@/theme/fonts";

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootStack() {
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
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: "ログイン" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const fontsLoaded = useHarborFonts();

  const onLayoutRootView = useCallback(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <View style={{ flex: 1 }} />;
  }

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <ThemeProvider>
        <AuthProvider>
          <RootStack />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
