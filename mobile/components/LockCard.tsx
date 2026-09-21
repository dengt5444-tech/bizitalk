import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading, Text } from "@/components/ui/Text";

export function LockCard({
  isLoggedIn,
  kind = "material",
}: {
  isLoggedIn: boolean;
  // "material" (listening materials — unlocked by the listening plan
  // alone) vs "deck" (vocab decks — unlocked by the listening plan OR any
  // AI conversation plan, since conversation plans bundle listening).
  kind?: "material" | "deck";
}) {
  const router = useRouter();
  const noun = kind === "deck" ? "単語帳" : "教材";

  return (
    <Card style={{ alignItems: "center", gap: 8, paddingVertical: 32 }}>
      <Heading level={4}>この{noun}はロックされています</Heading>
      <Text size={13} color="inkSoft" style={{ textAlign: "center" }}>
        {kind === "deck"
          ? isLoggedIn
            ? "リスニングプラン、またはAI英会話の各プランへの登録で全ての単語帳が学習できます。"
            : "ログインの上、リスニングプランまたはAI英会話プランへの登録が必要です。"
          : isLoggedIn
            ? "リスニングプランへの登録で全教材が再生できます。"
            : "ログインの上、リスニングプランへの登録が必要です。"}
      </Text>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
        {!isLoggedIn && <Button label="ログイン" variant="secondary" onPress={() => router.push("/login")} />}
        <Button label="料金プランを見る" onPress={() => router.push("/(tabs)/mypage")} />
      </View>
    </Card>
  );
}
