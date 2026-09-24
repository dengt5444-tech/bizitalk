import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Card, Text } from "@/components/ui";
import { useColors } from "@/theme";

export type ChoiceQuestion = { prompt: string; choices: string[]; answerIndex: number };

// Shared by the listening comprehension test and the vocabulary deck test:
// answer every question, grade, and (when signed in) save every miss to the
// review list — reporting the number of saves that actually succeeded.
export function ChoiceQuiz({
  questions,
  isLoggedIn,
  onSaveMissed,
}: {
  questions: ChoiceQuestion[];
  isLoggedIn: boolean;
  onSaveMissed: (missedIndices: number[]) => Promise<number>;
}) {
  const colors = useColors();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const allAnswered = questions.every((_, i) => answers[i] !== undefined);
  const score = questions.reduce((total, q, i) => total + (answers[i] === q.answerIndex ? 1 : 0), 0);

  async function handleSubmit() {
    setSubmitted(true);
    if (!isLoggedIn) return;
    const missed = questions.map((q, i) => (answers[i] === q.answerIndex ? -1 : i)).filter((i) => i >= 0);
    if (missed.length === 0) return;
    setSavedCount(await onSaveMissed(missed));
  }

  function handleRetry() {
    setAnswers({});
    setSubmitted(false);
    setSavedCount(0);
  }

  return (
    <View style={{ gap: 22 }}>
      {questions.map((q, i) => (
        <View key={i} style={{ gap: 10 }}>
          <Text variant="body" tone="ink" weight="600">
            Q{i + 1}. {q.prompt}
          </Text>
          {q.choices.map((choice, choiceIndex) => {
            const isSelected = answers[i] === choiceIndex;
            const isCorrect = submitted && choiceIndex === q.answerIndex;
            const isWrongSelected = submitted && isSelected && choiceIndex !== q.answerIndex;
            const palette = isCorrect
              ? { border: colors.amber, bg: colors.amberTint, fg: colors.amberDim }
              : isWrongSelected
                ? { border: colors.rose, bg: colors.roseTint, fg: colors.rose }
                : isSelected
                  ? { border: colors.signal, bg: colors.signalTint, fg: colors.signalDim }
                  : { border: colors.line, bg: "transparent", fg: colors.ink };
            return (
              <Pressable
                key={choiceIndex}
                disabled={submitted}
                onPress={() => setAnswers((prev) => ({ ...prev, [i]: choiceIndex }))}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected, disabled: submitted }}
                style={({ pressed }) => [
                  styles.choice,
                  { borderColor: palette.border, backgroundColor: palette.bg, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text variant="small" style={{ color: palette.fg }}>
                  {choice}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}

      {!submitted ? (
        <Button title="採点する" onPress={handleSubmit} disabled={!allAnswered} />
      ) : (
        <Card tone="paperDim" style={{ gap: 8 }}>
          <Text variant="heading">
            結果: {score} / {questions.length} 問正解
          </Text>
          {isLoggedIn ? (
            savedCount > 0 && (
              <Text variant="small" tone="signal">
                間違えた単語 {savedCount} 件を復習リストに保存しました。マイページの「復習リスト」から確認できます。
              </Text>
            )
          ) : (
            <Text variant="small">ログインすると、間違えた単語を自動で復習リストに保存できます。</Text>
          )}
          <Button title="もう一度挑戦する" variant="outline" size="sm" onPress={handleRetry} style={{ alignSelf: "flex-start" }} />
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  choice: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 },
});
