import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, View, useColorScheme } from "react-native";
import { Text } from "@/components/ui";
import { AuthProvider, useAuth } from "@/lib/auth";
import { missingConfig } from "@/lib/env";
import { PurchaseProvider } from "@/lib/iap";
import { PlanProvider } from "@/lib/plan";
import { darkColors, lightColors } from "@/theme/colors";

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootStack() {
  const { loading } = useAuth();
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? darkColors : lightColors;

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => {});
  }, [loading]);

  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.signal,
      background: colors.paper,
      card: colors.paper,
      text: colors.ink,
      border: colors.line,
    },
  };

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerBackButtonDisplayMode: "minimal",
          headerShadowVisible: false,
          headerTintColor: colors.signal,
          headerTitleStyle: { color: colors.ink },
          contentStyle: { backgroundColor: colors.paper },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: "ホーム" }} />
        <Stack.Screen name="conversation/[slug]" options={{ title: "" }} />
        <Stack.Screen name="history/index" options={{ title: "会話の記録" }} />
        <Stack.Screen name="history/[id]" options={{ title: "会話の詳細" }} />
        <Stack.Screen name="materials/[slug]" options={{ title: "" }} />
        <Stack.Screen name="vocabulary/[slug]" options={{ title: "" }} />
        <Stack.Screen name="review" options={{ title: "復習リスト" }} />
        <Stack.Screen name="pricing" options={{ title: "料金プラン" }} />
        <Stack.Screen name="login" options={{ title: "ログイン", presentation: "modal" }} />
        <Stack.Screen name="terms" options={{ title: "利用規約" }} />
        <Stack.Screen name="privacy" options={{ title: "プライバシーポリシー" }} />
        <Stack.Screen name="legal" options={{ title: "特定商取引法に基づく表記" }} />
      </Stack>
    </ThemeProvider>
  );
}

function MissingConfig() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  return (
    <View style={styles.config}>
      <Text variant="title">設定が不足しています</Text>
      <Text style={{ marginTop: 12 }}>
        このビルドには次の環境変数が設定されていません。mobile/.env(ローカル)または EAS の環境変数に設定してから、もう一度ビルドしてください。
      </Text>
      {missingConfig.map((name) => (
        <Text key={name} tone="rose" weight="600" style={{ marginTop: 8 }}>
          {name}
        </Text>
      ))}
    </View>
  );
}

export default function RootLayout() {
  if (missingConfig.length > 0) return <MissingConfig />;
  return (
    <AuthProvider>
      <PlanProvider>
        <PurchaseProvider>
          <RootStack />
        </PurchaseProvider>
      </PlanProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  config: { flex: 1, justifyContent: "center", padding: 28 },
});
