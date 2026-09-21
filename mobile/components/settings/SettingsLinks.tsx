import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React from "react";
import { Linking, Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { SUPPORT_EMAIL } from "@/lib/site";
import { useTheme } from "@/theme/ThemeProvider";

function Row({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 13,
      }}
    >
      <Text size={14}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
    </Pressable>
  );
}

export function SettingsLinks() {
  const theme = useTheme();
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <View style={{ borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.line, backgroundColor: theme.colors.surface, paddingHorizontal: 16 }}>
      <Row label="お問い合わせ" onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />
      <View style={{ height: 1, backgroundColor: theme.colors.lineSoft }} />
      <Row label="利用規約" onPress={() => router.push("/terms")} />
      <View style={{ height: 1, backgroundColor: theme.colors.lineSoft }} />
      <Row label="プライバシーポリシー" onPress={() => router.push("/privacy")} />
      <View style={{ height: 1, backgroundColor: theme.colors.lineSoft }} />
      <Row label="特定商取引法に基づく表記" onPress={() => router.push("/legal")} />
      <View style={{ height: 1, backgroundColor: theme.colors.lineSoft }} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 13 }}>
        <Text size={14} color="inkFaint">
          バージョン
        </Text>
        <Text size={14} color="inkFaint">
          {version}
        </Text>
      </View>
    </View>
  );
}
