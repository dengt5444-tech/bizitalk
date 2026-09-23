import { ArrowRight } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Badge, Button, Text } from "@/components/ui";
import { api } from "@/lib/api";
import type { ConversationFeedback } from "@/lib/conversation";
import { fonts, useColors } from "@/theme";

export function FeedbackPanel({ feedback, scenarioTitle }: { feedback: ConversationFeedback; scenarioTitle: string }) {
  const colors = useColors();
  const [savedVocab, setSavedVocab] = useState<Set<string>>(new Set());

  async function handleSaveVocab(word: string, meaning: string) {
    setSavedVocab((prev) => new Set(prev).add(word));
    try {
      await api.post("/api/review/words", { sourceTitle: scenarioTitle, word, meaning });
    } catch {
      setSavedVocab((prev) => {
        const next = new Set(prev);
        next.delete(word);
        return next;
      });
    }
  }

  const categories = [
    ["文法", feedback.categoryScores?.grammar],
    ["語彙", feedback.categoryScores?.vocabulary],
    ["丁寧さ", feedback.categoryScores?.professionalism],
  ] as const;

  return (
    <View style={{ gap: 26 }}>
      <View style={{ gap: 12 }}>
        <Text variant="eyebrow">フルエンシー評価</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 34, color: colors.ink }}>
          {feedback.fluencyScore}
          <Text variant="heading" tone="inkFaint">
            {" "}
            / 5
          </Text>
        </Text>
        <View style={styles.scoreRow}>
          {categories.map(([label, score]) => (
            <View key={label} style={[styles.scoreTile, { backgroundColor: colors.paperDim }]}>
              <Text variant="caption" center>
                {label}
              </Text>
              <Text variant="heading" center>
                {score ?? "-"}
                <Text variant="caption">/5</Text>
              </Text>
            </View>
          ))}
        </View>
        <Text variant="small">{feedback.overallComment}</Text>
      </View>

      {feedback.goodExpressions.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text variant="heading" style={{ fontSize: 15 }}>
            よく使えていた表現
          </Text>
          <View style={styles.wrap}>
            {feedback.goodExpressions.map((phrase, i) => (
              <Badge key={i} tone="amber" label={phrase} />
            ))}
          </View>
        </View>
      )}

      {feedback.corrections.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text variant="heading" style={{ fontSize: 15 }}>
            直すとよい表現
          </Text>
          {feedback.corrections.map((c, i) => (
            <View key={i} style={[styles.item, { backgroundColor: colors.paperDim }]}>
              <Text variant="small" tone="rose" style={{ textDecorationLine: "line-through" }} selectable>
                {c.original}
              </Text>
              <View style={styles.correctedRow}>
                <ArrowRight size={14} color={colors.signalDim} style={{ marginTop: 3 }} />
                <Text variant="small" tone="signalDim" weight="600" style={{ flex: 1 }} selectable>
                  {c.corrected}
                </Text>
              </View>
              <Text variant="caption" tone="inkSoft">
                {c.explanation}
              </Text>
            </View>
          ))}
        </View>
      )}

      {feedback.vocabSuggestions.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text variant="heading" style={{ fontSize: 15 }}>
            使えると良い単語・表現
          </Text>
          {feedback.vocabSuggestions.map((v, i) => {
            const isSaved = savedVocab.has(v.word);
            return (
              <View key={i} style={[styles.item, styles.vocabRow, { backgroundColor: colors.paperDim }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="body" tone="ink" weight="600" selectable>
                    {v.word}
                  </Text>
                  <Text variant="small">{v.meaning}</Text>
                  <Text variant="caption" style={{ fontStyle: "italic" }} selectable>
                    {v.example}
                  </Text>
                </View>
                <Button
                  size="sm"
                  variant="outline"
                  title={isSaved ? "保存済み" : "+ 復習に追加"}
                  disabled={isSaved}
                  onPress={() => handleSaveVocab(v.word, v.meaning)}
                />
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scoreRow: { flexDirection: "row", gap: 10 },
  scoreTile: { flex: 1, borderRadius: 14, paddingVertical: 12, gap: 4 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  item: { borderRadius: 14, padding: 14, gap: 4 },
  correctedRow: { flexDirection: "row", gap: 6 },
  vocabRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
});
