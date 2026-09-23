import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Card, Text } from "@/components/ui";
import { shuffled } from "@/lib/shuffle";
import { useColors } from "@/theme";

export type FlashcardItem = { key: string; front: string; frontLabel?: string; back: string; backDetail?: string };

// Shuffled flip cards with "覚えていた / もう一度" sorting — the same flow as
// the web app's vocabulary deck and review list flashcards.
export function Flashcards({ items, doneMessage }: { items: FlashcardItem[]; doneMessage: string }) {
  const colors = useColors();
  const [deck, setDeck] = useState(() => shuffled(items));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);

  if (deck.length === 0) return null;
  const card = deck[index];

  function next(knew: boolean) {
    if (knew) setKnownCount((c) => c + 1);
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  function restart() {
    setDeck(shuffled(items));
    setIndex(0);
    setFlipped(false);
    setKnownCount(0);
  }

  if (index >= deck.length) {
    return (
      <Card style={{ alignItems: "center", gap: 10, paddingVertical: 32 }}>
        <Text variant="heading" center>
          {deck.length}語、{doneMessage}
        </Text>
        <Text variant="small" center>
          「覚えていた」と答えたのは {knownCount} / {deck.length} 語でした。
        </Text>
        <Button title="もう一度シャッフルして復習する" onPress={restart} style={{ marginTop: 10 }} />
      </Card>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <Text variant="caption" center>
        {index + 1} / {deck.length}
      </Text>
      <Pressable
        onPress={() => setFlipped((f) => !f)}
        accessibilityRole="button"
        accessibilityHint={`タップして${flipped ? "単語" : "意味"}を見る`}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.surface, shadowColor: colors.shadow, opacity: pressed ? 0.9 : 1 },
        ]}
      >
        {flipped ? (
          <>
            <Text variant="eyebrow" tone="inkFaint">
              意味
            </Text>
            <Text variant="title" center style={{ fontSize: 21 }}>
              {card.back || "(意味の登録がありません)"}
            </Text>
            {card.backDetail ? (
              <Text variant="small" tone="inkFaint" center style={{ fontStyle: "italic" }}>
                {card.backDetail}
              </Text>
            ) : null}
          </>
        ) : (
          <>
            {card.frontLabel ? (
              <Text variant="eyebrow" tone="inkFaint" center>
                {card.frontLabel}
              </Text>
            ) : null}
            <Text variant="title" center style={{ fontSize: 26, lineHeight: 34 }}>
              {card.front}
            </Text>
          </>
        )}
        <Text variant="caption" style={{ marginTop: 8 }}>
          タップして{flipped ? "単語" : "意味"}を見る
        </Text>
      </Pressable>
      <View style={styles.buttons}>
        <Button title="もう一度復習したい" variant="outline" onPress={() => next(false)} style={{ flex: 1 }} />
        <Button title="覚えていた" onPress={() => next(true)} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 220,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  buttons: { flexDirection: "row", gap: 10 },
});
