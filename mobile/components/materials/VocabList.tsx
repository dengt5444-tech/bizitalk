import { useRouter } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import { Card } from "@/components/ui/Card";
import { Heading, Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import type { VocabItem } from "@/lib/materials";
import { useTheme } from "@/theme/ThemeProvider";

export function VocabList({
  materialId,
  materialTitle,
  vocab,
  isLoggedIn,
}: {
  materialId: string;
  materialTitle: string;
  vocab: VocabItem[];
  isLoggedIn: boolean;
}) {
  const theme = useTheme();
  const router = useRouter();
  const [saved, setSaved] = useState<Set<string>>(new Set());

  if (vocab.length === 0) return null;

  async function handleSave(item: VocabItem) {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    await api.post("/api/review/listening-words", {
      materialId,
      materialTitle,
      word: item.word,
      meaning: item.meaning,
    });
    setSaved((prev) => new Set(prev).add(item.word));
  }

  return (
    <Card style={{ gap: 12 }}>
      <Heading level={4}>重要単語・難しい単語</Heading>
      <View style={{ gap: 8 }}>
        {vocab.map((item) => {
          const isSaved = saved.has(item.word);
          return (
            <View
              key={item.word}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                backgroundColor: theme.colors.paperDim,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text weight="medium">{item.word}</Text>
                <Text size={13} color="inkSoft">
                  {item.meaning}
                </Text>
              </View>
              <Button
                label={isSaved ? "保存済み" : "+ 復習に追加"}
                variant="secondary"
                disabled={isSaved}
                onPress={() => handleSave(item)}
              />
            </View>
          );
        })}
      </View>
    </Card>
  );
}
