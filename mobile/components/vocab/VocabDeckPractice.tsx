import React, { useMemo, useState } from "react";
import { Alert, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading, Text } from "@/components/ui/Text";
import { api } from "@/lib/api";
import { shuffled } from "@/lib/shuffle";
import type { VocabWord } from "@/lib/vocab";
import { useTheme } from "@/theme/ThemeProvider";
import { FlashcardDeck } from "./FlashcardDeck";
import { ModeTabs } from "./ModeTabs";

type Mode = "list" | "flashcards" | "quiz";

const MODES: { key: Mode; label: string }[] = [
  { key: "list", label: "単語一覧" },
  { key: "flashcards", label: "フラッシュカード" },
  { key: "quiz", label: "テストで確認する" },
];

export function VocabDeckPractice({
  deckTitle,
  words,
  isLoggedIn,
}: {
  deckTitle: string;
  words: VocabWord[];
  isLoggedIn: boolean;
}) {
  const [mode, setMode] = useState<Mode>("list");

  return (
    <View style={{ gap: 16 }}>
      <ModeTabs modes={MODES} active={mode} onChange={setMode} />

      {mode === "list" && (
        <View style={{ gap: 10 }}>
          {words.map((w) => (
            <Card key={w.word} style={{ gap: 4 }}>
              <Text weight="semibold">{w.word}</Text>
              <Text size={13} color="inkSoft">
                {w.meaning}
              </Text>
              <Text size={13} color="inkFaint" style={{ fontStyle: "italic", lineHeight: 18 }}>
                {w.example}
              </Text>
            </Card>
          ))}
        </View>
      )}

      {mode === "flashcards" && (
        <FlashcardDeck
          items={words}
          getKey={(w) => w.word}
          renderFront={(w) => <Heading level={3}>{w.word}</Heading>}
          renderBack={(w) => (
            <>
              <Text eyebrow color="inkFaint">
                意味
              </Text>
              <Heading level={4}>{w.meaning}</Heading>
              <Text size={13} color="inkFaint" style={{ fontStyle: "italic", textAlign: "center" }}>
                {w.example}
              </Text>
            </>
          )}
        />
      )}

      {mode === "quiz" && <VocabQuiz words={words} deckTitle={deckTitle} isLoggedIn={isLoggedIn} />}
    </View>
  );
}

type QuizQuestion = { word: VocabWord; choices: string[]; answerIndex: number };

function buildQuiz(words: VocabWord[]): QuizQuestion[] {
  return shuffled(words).map((word) => {
    const distractorPool = words.filter((w) => w.word !== word.word).map((w) => w.meaning);
    const distractors = shuffled(distractorPool).slice(0, 3);
    const choices = shuffled([word.meaning, ...distractors]);
    return { word, choices, answerIndex: choices.indexOf(word.meaning) };
  });
}

function VocabQuiz({
  words,
  deckTitle,
  isLoggedIn,
}: {
  words: VocabWord[];
  deckTitle: string;
  isLoggedIn: boolean;
}) {
  const theme = useTheme();
  const questions = useMemo(() => buildQuiz(words), [words]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  if (questions.length < 2) {
    return (
      <Text size={13} color="inkSoft">
        テストを作るには単語がもう少し必要です。
      </Text>
    );
  }

  const allAnswered = questions.every((_, i) => answers[i] !== undefined);
  const score = questions.reduce((total, q, i) => total + (answers[i] === q.answerIndex ? 1 : 0), 0);

  async function handleSubmit() {
    setSubmitted(true);
    if (!isLoggedIn) return;

    const missed = questions.filter((q, i) => answers[i] !== q.answerIndex);
    try {
      await Promise.all(
        missed.map((q) =>
          api.post("/api/review/words", {
            sourceTitle: deckTitle,
            word: q.word.word,
            meaning: q.word.meaning,
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
    <View style={{ gap: 20 }}>
      {questions.map((q, i) => (
        <View key={q.word.word} style={{ gap: 8 }}>
          <Text weight="medium">
            Q{i + 1}. 「{q.word.word}」の意味は?
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
                <Button
                  key={choice}
                  label={choice}
                  variant="secondary"
                  disabled={submitted}
                  onPress={() => setAnswers((prev) => ({ ...prev, [i]: choiceIndex }))}
                  fullWidth
                  style={{ borderColor, backgroundColor, alignItems: "flex-start" }}
                />
              );
            })}
          </View>
        </View>
      ))}

      {!submitted ? (
        <Button label="採点する" onPress={handleSubmit} disabled={!allAnswered} fullWidth />
      ) : (
        <Card style={{ gap: 8, backgroundColor: theme.colors.paperDim }}>
          <Heading level={4}>
            結果: {score} / {questions.length} 問正解
          </Heading>
          {isLoggedIn ? (
            savedCount > 0 && (
              <Text size={13} color="signal">
                間違えた単語 {savedCount} 件を復習リストに保存しました。「復習」タブから確認できます。
              </Text>
            )
          ) : (
            <Text size={13} color="inkSoft">
              ログインすると、間違えた単語を自動で復習リストに保存できます。
            </Text>
          )}
          <Button label="もう一度挑戦する" variant="secondary" onPress={handleRetry} />
        </Card>
      )}
    </View>
  );
}
