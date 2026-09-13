import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading, Text } from "@/components/ui/Text";

export function LockCard({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter();

  return (
    <Card style={{ alignItems: "center", gap: 8, paddingVertical: 32 }}>
      <Heading level={4}>この教材はロックされています</Heading>
      <Text size={13} color="inkSoft" style={{ textAlign: "center" }}>
        {isLoggedIn
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
