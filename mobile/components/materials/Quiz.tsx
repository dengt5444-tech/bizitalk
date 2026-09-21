import React, { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading, Text } from "@/components/ui/Text";
import { api } from "@/lib/api";
import type { QuizQuestion } from "@/lib/materials";
import { useTheme } from "@/theme/ThemeProvider";

export function Quiz({
  materialId,
  materialTitle,
  questions,
  isLoggedIn,
}: {
  materialId: string;
  materialTitle: string;
  questions: QuizQuestion[];
  isLoggedIn: boolean;
}) {
  const theme = useTheme();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  if (questions.length === 0) return null;

  const allAnswered = questions.every((_, i) => answers[i] !== undefined);
  const score = questions.reduce((total, q, i) => total + (answers[i] === q.answerIndex ? 1 : 0), 0);

  async function handleSubmit() {
    setSubmitted(true);
    if (!isLoggedIn) return;

    const missed = questions.filter((q, i) => answers[i] !== q.answerIndex && q.word);
    try {
      await Promise.all(
        missed.map((q) =>
          api.post("/api/review/listening-words", {
            materialId,
            materialTitle,
            word: q.word,
            meaning: q.wordMeaning ?? "",
          }),
        ),
      );
      setSavedCount(missed.length);
    } catch {
      Alert.alert("保存に失敗しました", "間違えた単語を復習リストに保存できませんでした。通信環境をご確認のうえ、もう一度お試しください。");
    }
  }

  function handleRetry() {
    setAnswers({});
    setSubmitted(false);
    setSavedCount(0);
  }

  return (
    <Card style={{ gap: 16 }}>
      <View>
        <Heading level={4}>理解度テスト</Heading>
        <Text size={13} color="inkSoft" style={{ marginTop: 2 }}>
          音声を聞いてから挑戦してみましょう。全{questions.length}問。
        </Text>
      </View>

      <View style={{ gap: 18 }}>
        {questions.map((q, i) => (
          <View key={i} style={{ gap: 8 }}>
            <Text weight="medium">
              Q{i + 1}. {q.question}
            </Text>
            <View style={{ gap: 8 }}>
              {q.choices.map((choice, choiceIndex) => {
                const isSelected = answers[i] === choiceIndex;
                const isCorrect = submitted && choiceIndex === q.answerIndex;
                const isWrongSelected = submitted && isSelected && choiceIndex !== q.answerIndex;

                const borderColor = isCorrect
                  ? theme.colors.amber
                  : isWrongSelected
                    ? theme.colors.rose
                    : isSelected
                      ? theme.colors.signal
                      : theme.colors.line;
                const backgroundColor = isCorrect
                  ? theme.colors.amberTint
                  : isWrongSelected
                    ? theme.colors.roseTint
                    : isSelected
                      ? theme.colors.signalTint
                      : "transparent";

                return (
                  <Pressable
                    key={choiceIndex}
                    disabled={submitted}
                    onPress={() => setAnswers((prev) => ({ ...prev, [i]: choiceIndex }))}
                    style={{
                      borderWidth: 1,
                      borderColor,
                      backgroundColor,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                    }}
                  >
                    <Text size={14}>{choice}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </View>

      {!submitted ? (
        <Button label="採点する" onPress={handleSubmit} disabled={!allAnswered} fullWidth />
      ) : (
        <View style={{ backgroundColor: theme.colors.paperDim, borderRadius: 12, padding: 14, gap: 8 }}>
          <Heading level={4}>
            結果: {score} / {questions.length} 問正解
          </Heading>
          {isLoggedIn ? (
            savedCount > 0 && (
              <Text size={13} color="signal">
                間違えた単語 {savedCount}件を復習リストに保存しました。「復習」タブから確認できます。
              </Text>
            )
          ) : (
            <Text size={13} color="inkSoft">
              ログインすると、間違えた単語を自動で復習リストに保存できます。
            </Text>
          )}
          <Button label="もう一度挑戦する" variant="secondary" onPress={handleRetry} />
        </View>
      )}
    </Card>
  );
}
