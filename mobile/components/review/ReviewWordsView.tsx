import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { FlashcardDeck } from "@/components/vocab/FlashcardDeck";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading, Text } from "@/components/ui/Text";
import type { ReviewWord } from "@/lib/queries/review";
import { RemoveWordButton } from "./RemoveWordButton";

type Mode = "list" | "flashcards";

export function ReviewWordsView({
  words,
  onRemove,
}: {
  words: ReviewWord[];
  onRemove: (id: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("list");

  const groups = useMemo(() => {
    const map = new Map<string, ReviewWord[]>();
    for (const w of words) {
      const list = map.get(w.groupTitle) ?? [];
      list.push(w);
      map.set(w.groupTitle, list);
    }
    return Array.from(map.entries());
  }, [words]);

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text size={13} color="inkSoft">
          全{words.length}語
        </Text>
        <Button
          label={mode === "list" ? "フラッシュカードで復習する →" : "← リスト表示に戻る"}
          onPress={() => setMode(mode === "list" ? "flashcards" : "list")}
        />
      </View>

      {mode === "flashcards" ? (
        <FlashcardDeck
          key={words.map((w) => w.id).join(",")}
          items={words}
          getKey={(w) => w.id}
          renderFront={(w) => (
            <>
              <Text eyebrow color="inkFaint">
                {w.groupTitle}
              </Text>
              <Heading level={3}>{w.word}</Heading>
            </>
          )}
          renderBack={(w) => (
            <>
              <Text eyebrow color="inkFaint">
                意味
              </Text>
              <Heading level={4}>{w.meaning || "(意味の登録がありません)"}</Heading>
            </>
          )}
        />
      ) : (
        <View style={{ gap: 24 }}>
          {groups.map(([groupTitle, items]) => (
            <View key={groupTitle} style={{ gap: 8 }}>
              <Text eyebrow color="inkFaint">
                {groupTitle}
              </Text>
              <View style={{ gap: 8 }}>
                {items.map((item) => (
                  <Card key={item.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14 }}>
                    <View style={{ flex: 1 }}>
                      <Text weight="medium">{item.word}</Text>
                      {!!item.meaning && (
                        <Text size={13} color="inkSoft">
                          {item.meaning}
                        </Text>
                      )}
                    </View>
                    <RemoveWordButton id={item.id} source={item.source} onRemoved={() => onRemove(item.id)} />
                  </Card>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
