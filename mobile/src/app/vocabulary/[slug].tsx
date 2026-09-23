import { Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ChoiceQuiz } from "@/components/practice/ChoiceQuiz";
import { Flashcards } from "@/components/practice/Flashcards";
import { Badge, Card, ErrorState, Loading, Screen, Text } from "@/components/ui";
import { api, runWithConcurrencyLimit } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fetchDeck } from "@/lib/queries";
import { shuffled } from "@/lib/shuffle";
import { useAsync } from "@/lib/useAsync";
import type { VocabWord } from "@/lib/vocab";
import { fonts, radius, useColors } from "@/theme";

type Mode = "list" | "flashcards" | "quiz";
const MODE_LABELS: Record<Mode, string> = { list: "単語一覧", flashcards: "フラッシュカード", quiz: "テスト" };

export default function VocabDeckScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: deck, error, loading, reload } = useAsync(() => fetchDeck(slug), [slug]);

  if (loading) return <Loading />;
  if (error) return <ErrorState onRetry={reload} />;
  if (!deck) return <ErrorState message="単語帳が見つかりませんでした。" />;

  return <DeckPractice title={deck.title} description={deck.description} words={(deck.items ?? []) as VocabWord[]} />;
}

function DeckPractice({ title, description, words }: { title: string; description: string; words: VocabWord[] }) {
  const colors = useColors();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("list");
  const [quizKey, setQuizKey] = useState(0);

  // Rebuilt (reshuffled) each time the test tab is entered.
  const questions = useMemo(() => {
    void quizKey;
    return shuffled(words).map((word) => {
      const distractors = shuffled(words.filter((w) => w.word !== word.word).map((w) => w.meaning)).slice(0, 3);
      const choices = shuffled([word.meaning, ...distractors]);
      return { word, prompt: `“${word.word}” の意味は?`, choices, answerIndex: choices.indexOf(word.meaning) };
    });
  }, [words, quizKey]);

  async function saveMissed(missed: number[]) {
    const results = await runWithConcurrencyLimit(
      missed.map((i) => () =>
        api.post("/api/review/words", { sourceTitle: title, word: questions[i].word.word, meaning: questions[i].word.meaning }),
      ),
      6,
    );
    return results.filter((r) => r.status === "fulfilled").length;
  }

  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      <Badge tone="signal" label={`${words.length}語`} />
      <Text variant="title">{title}</Text>
      <Text>{description}</Text>

      <View style={[styles.segment, { backgroundColor: colors.paperDim }]}>
        {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
          <Pressable
            key={m}
            onPress={() => {
              if (m === "quiz" && mode !== "quiz") setQuizKey((k) => k + 1);
              setMode(m);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === m }}
            style={[styles.segmentItem, mode === m && { backgroundColor: colors.surface, shadowColor: colors.shadow }, mode === m && styles.segmentActive]}
          >
            <Text variant="small" weight="600" tone={mode === m ? "ink" : "inkSoft"}>
              {MODE_LABELS[m]}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === "list" &&
        words.map((w) => (
          <Card key={w.word} style={{ gap: 4 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 17, fontWeight: "600", color: colors.ink }} selectable>
              {w.word}
            </Text>
            <Text variant="small">{w.meaning}</Text>
            <Text variant="small" tone="inkFaint" style={{ fontStyle: "italic", marginTop: 4 }} selectable>
              {w.example}
            </Text>
          </Card>
        ))}

      {mode === "flashcards" && (
        <Flashcards
          items={words.map((w) => ({ key: w.word, front: w.word, back: w.meaning, backDetail: w.example }))}
          doneMessage="お疲れさまでした!"
        />
      )}

      {mode === "quiz" &&
        (questions.length < 2 ? (
          <Text variant="small">テストを作るには単語がもう少し必要です。</Text>
        ) : (
          <ChoiceQuiz key={quizKey} questions={questions} isLoggedIn={!!user} onSaveMissed={saveMissed} />
        ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: "row", borderRadius: radius.pill, padding: 4 },
  segmentItem: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: radius.pill },
  segmentActive: { shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
});
