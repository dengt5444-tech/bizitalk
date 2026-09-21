import React, { useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading, Text } from "@/components/ui/Text";
import { api } from "@/lib/api";
import type { ConversationFeedback } from "@/lib/conversation";
import { useTheme } from "@/theme/ThemeProvider";

export function FeedbackPanel({
  feedback,
  scenarioTitle,
}: {
  feedback: ConversationFeedback;
  scenarioTitle: string;
}) {
  const theme = useTheme();
  const [saved, setSaved] = useState<Set<string>>(new Set());

  async function handleSave(word: string, meaning: string) {
    setSaved((prev) => new Set(prev).add(word));
    await api.post("/api/review/words", { sourceTitle: scenarioTitle, word, meaning });
  }

  const scoreRows: [string, number | undefined][] = [
    ["文法", feedback.categoryScores?.grammar],
    ["語彙", feedback.categoryScores?.vocabulary],
    ["丁寧さ", feedback.categoryScores?.professionalism],
  ];

  return (
    <View style={{ gap: 24 }}>
      <View>
        <Text eyebrow color="signal" weight="medium">
          フルエンシー評価
        </Text>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, marginTop: 8 }}>
          <Heading level={1}>{feedback.fluencyScore}</Heading>
          <Text size={16} color="inkFaint">
            / 5
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
          {scoreRows.map(([label, score]) => (
            <View
              key={label}
              style={{
                flex: 1,
                backgroundColor: theme.colors.paperDim,
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: "center",
                gap: 4,
              }}
            >
              <Text size={11} color="inkFaint">
                {label}
              </Text>
              <Text weight="semibold" size={16}>
                {score ?? "-"}
                <Text size={11} color="inkFaint">
                  /5
                </Text>
              </Text>
            </View>
          ))}
        </View>

        <Text size={13} color="inkSoft" style={{ marginTop: 14, lineHeight: 20 }}>
          {feedback.overallComment}
        </Text>
      </View>

      {feedback.goodExpressions.length > 0 && (
        <View style={{ gap: 8 }}>
          <Heading level={4}>よく使えていた表現</Heading>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {feedback.goodExpressions.map((phrase, i) => (
              <View
                key={i}
                style={{
                  backgroundColor: theme.colors.amberTint,
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text size={12} weight="medium" color="amberDim">
                  {phrase}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {feedback.corrections.length > 0 && (
        <View style={{ gap: 8 }}>
          <Heading level={4}>直すとよい表現</Heading>
          <View style={{ gap: 10 }}>
            {feedback.corrections.map((c, i) => (
              <View key={i} style={{ backgroundColor: theme.colors.paperDim, borderRadius: 12, padding: 14, gap: 4 }}>
                <Text size={13} color="rose" style={{ textDecorationLine: "line-through" }}>
                  {c.original}
                </Text>
                <Text size={13} weight="medium" color="signalDim">
                  → {c.corrected}
                </Text>
                <Text size={12} color="inkSoft">
                  {c.explanation}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {feedback.vocabSuggestions.length > 0 && (
        <View style={{ gap: 8 }}>
          <Heading level={4}>使えると良い単語・表現</Heading>
          <View style={{ gap: 8 }}>
            {feedback.vocabSuggestions.map((v, i) => {
              const isSaved = saved.has(v.word);
              return (
                <Card key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text weight="medium">{v.word}</Text>
                    <Text size={13} color="inkSoft">
                      {v.meaning}
                    </Text>
                    <Text size={12} color="inkFaint" style={{ fontStyle: "italic" }}>
                      {v.example}
                    </Text>
                  </View>
                  <Button
                    label={isSaved ? "保存済み" : "+ 復習に追加"}
                    variant="secondary"
                    disabled={isSaved}
                    onPress={() => handleSave(v.word, v.meaning)}
                  />
                </Card>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}
