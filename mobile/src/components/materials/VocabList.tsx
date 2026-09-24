import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Card, Text } from "@/components/ui";
import { api } from "@/lib/api";
import type { VocabItem } from "@/lib/materials";
import { useColors } from "@/theme";

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
  const colors = useColors();
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());

  if (vocab.length === 0) return null;

  async function handleSave(item: VocabItem) {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    setSavedWords((prev) => new Set(prev).add(item.word));
    try {
      await api.post("/api/review/listening-words", {
        materialId,
        materialTitle,
        word: item.word,
        meaning: item.meaning,
      });
    } catch {
      setSavedWords((prev) => {
        const next = new Set(prev);
        next.delete(item.word);
        return next;
      });
    }
  }

  return (
    <Card style={{ gap: 10 }}>
      <Text variant="heading">重要単語・難しい単語</Text>
      {vocab.map((item) => {
        const isSaved = savedWords.has(item.word);
        return (
          <View key={item.word} style={[styles.row, { backgroundColor: colors.paperDim }]}>
            <View style={{ flex: 1 }}>
              <Text variant="body" tone="ink" weight="600" selectable>
                {item.word}
              </Text>
              <Text variant="small">{item.meaning}</Text>
            </View>
            <Button
              size="sm"
              variant="outline"
              title={isSaved ? "保存済み" : "+ 復習に追加"}
              disabled={isSaved}
              onPress={() => handleSave(item)}
            />
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
});
