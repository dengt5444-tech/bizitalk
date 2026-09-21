import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading, Text } from "@/components/ui/Text";
import { shuffled } from "@/lib/shuffle";

export function FlashcardDeck<T>({
  items,
  getKey,
  renderFront,
  renderBack,
  onFinish,
}: {
  items: T[];
  getKey: (item: T) => string;
  renderFront: (item: T) => React.ReactNode;
  renderBack: (item: T) => React.ReactNode;
  onFinish?: (knownCount: number, total: number) => void;
}) {
  const [deck] = useState(() => shuffled(items));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);

  const done = index >= deck.length;
  const card = deck[index];

  function next(knew: boolean) {
    const nextKnown = knew ? knownCount + 1 : knownCount;
    if (knew) setKnownCount(nextKnown);
    setFlipped(false);
    const nextIndex = index + 1;
    setIndex(nextIndex);
    if (nextIndex >= deck.length) onFinish?.(nextKnown, deck.length);
  }

  function restart() {
    setIndex(0);
    setFlipped(false);
    setKnownCount(0);
  }

  if (deck.length === 0) return null;

  if (done) {
    return (
      <Card style={{ alignItems: "center", gap: 8, paddingVertical: 28 }}>
        <Heading level={4}>{deck.length}語、お疲れさまでした!</Heading>
        <Text size={13} color="inkSoft">
          「覚えていた」と答えたのは {knownCount} / {deck.length} 語でした。
        </Text>
        <Button label="もう一度シャッフルして復習する" onPress={restart} />
      </Card>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <Text size={12} color="inkFaint" style={{ textAlign: "center" }}>
        {index + 1} / {deck.length}
      </Text>
      <Pressable onPress={() => setFlipped((f) => !f)}>
        <Card style={{ minHeight: 180, alignItems: "center", justifyContent: "center", gap: 10 }}>
          {flipped ? renderBack(card) : renderFront(card)}
          <Text size={11} color="inkFaint">
            タップして{flipped ? "単語" : "意味"}を見る
          </Text>
        </Card>
      </Pressable>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button label="もう一度復習したい" variant="secondary" onPress={() => next(false)} fullWidth />
        <Button label="覚えていた" onPress={() => next(true)} fullWidth />
      </View>
    </View>
  );
}
