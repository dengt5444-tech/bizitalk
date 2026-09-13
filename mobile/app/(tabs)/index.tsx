import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScreenScroll } from "@/components/ui/ScreenContainer";
import { Heading, Text } from "@/components/ui/Text";
import { useAuth } from "@/context/AuthProvider";
import { useTheme } from "@/theme/ThemeProvider";

const FEATURES = [
  {
    icon: "🗣️",
    title: "AIとリアルタイム音声で会話練習",
    description:
      "CEO、海外の同僚、取引先——相手役・シチュエーション別に、実際のビジネスシーンに近い形で英語を話す練習ができます。",
  },
  {
    icon: "📝",
    title: "会話ごとのAIコーチによるフィードバック",
    description: "文法・語彙・丁寧さをスコアリングし、改善点と良かった表現を具体的に教えてくれます。",
  },
  {
    icon: "📚",
    title: "苦手単語の復習リスト",
    description: "会話や単語帳で出てきた単語を自動で保存。「復習」タブでいつでも見返せます。",
  },
];

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  return (
    <ScreenScroll contentContainerStyle={{ gap: 28, paddingBottom: 48 }}>
      <View
        style={{
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.ink,
          padding: 28,
          gap: 16,
        }}
      >
        <Badge label="1シーンは無料でお試しいただけます" accent="signal" />
        <Heading level={1} style={{ color: theme.colors.paper }}>
          話す。伝わる。{"\n"}使えるビジネス英語へ。
        </Heading>
        <Text style={{ color: theme.colors.inkFaint, lineHeight: 22 }}>
          ビジトークは、CEOや海外の同僚、取引先など相手役別のシナリオでAIとリアルタイム音声会話を練習し、AIコーチのフィードバックで着実に力をつけるビジネス英会話サービスです。
        </Text>
        <View style={{ gap: 10 }}>
          <Button label="無料のシーンを話してみる" onPress={() => router.push("/(tabs)/conversation")} fullWidth />
          <Button
            label="料金プランを見る"
            variant="secondary"
            onPress={() => router.push("/(tabs)/mypage")}
            fullWidth
            style={{ borderColor: theme.colors.inkFaint }}
          />
        </View>
      </View>

      {!user && (
        <Card style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text weight="medium">ログインしてはじめる</Text>
            <Text size={13} color="inkSoft" style={{ marginTop: 2 }}>
              会話履歴・復習リスト・進捗の記録にはログインが必要です。
            </Text>
          </View>
          <Button label="ログイン" onPress={() => router.push("/login")} />
        </Card>
      )}

      <View style={{ gap: 14 }}>
        <Text eyebrow color="signal" weight="medium">
          Features
        </Text>
        {FEATURES.map((feature) => (
          <Card key={feature.title} style={{ gap: 6 }}>
            <Text size={22}>{feature.icon}</Text>
            <Text weight="semibold" size={16}>
              {feature.title}
            </Text>
            <Text size={13} color="inkSoft" style={{ lineHeight: 19 }}>
              {feature.description}
            </Text>
          </Card>
        ))}
      </View>

      <Card style={{ alignItems: "center", gap: 8 }}>
        <Text eyebrow color="amber" weight="medium">
          Listening
        </Text>
        <Heading level={3}>リスニング教材も聞き放題</Heading>
        <Text size={13} color="inkSoft" style={{ textAlign: "center" }}>
          AI会話プランのいずれか、またはリスニング単体プランで、ビジネス英語のリスニング教材が聞き放題になります。
        </Text>
        <Button label="教材を見る" variant="secondary" onPress={() => router.push("/(tabs)/materials")} />
      </Card>
    </ScreenScroll>
  );
}
