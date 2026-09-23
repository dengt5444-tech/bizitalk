import { Stack, useLocalSearchParams } from "expo-router";
import { ChevronDown } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AudioPlayer } from "@/components/materials/AudioPlayer";
import { DialogueTranscript } from "@/components/materials/DialogueTranscript";
import { VocabList } from "@/components/materials/VocabList";
import { ChoiceQuiz } from "@/components/practice/ChoiceQuiz";
import { SceneImage } from "@/components/SceneImage";
import { Badge, Card, ErrorState, Loading, Screen, Text } from "@/components/ui";
import { api, runWithConcurrencyLimit } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  EXCLUDED_MATERIAL_SLUGS,
  LEVEL_LABELS,
  MATERIAL_SCENES,
  type DialogueLine,
  type MaterialLevel,
  type QuizQuestion,
  type VocabItem,
} from "@/lib/materials";
import { fetchMaterial } from "@/lib/queries";
import { useAsync } from "@/lib/useAsync";
import { useColors } from "@/theme";

export default function MaterialScreen() {
  const colors = useColors();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();
  const { data: material, error, loading, reload } = useAsync(
    async () => (EXCLUDED_MATERIAL_SLUGS.has(slug) ? null : fetchMaterial(slug)),
    [slug],
  );
  const [showScript, setShowScript] = useState(false);

  if (loading) return <Loading />;
  if (error) return <ErrorState onRetry={reload} />;
  if (!material) return <ErrorState message="教材が見つかりませんでした。" />;

  const vocab = (material.vocab ?? []) as VocabItem[];
  const quiz = (material.quiz ?? []) as QuizQuestion[];
  const dialogue = (material.dialogue ?? []) as DialogueLine[];

  async function saveMissed(missed: number[]) {
    const results = await runWithConcurrencyLimit(
      missed.map((i) => () => {
        const q = quiz[i];
        // Plain comprehension questions (no tagged word) are still saved,
        // keyed by the question with the correct answer as the "meaning".
        return api.post("/api/review/listening-words", {
          materialId: material!.id,
          materialTitle: material!.title,
          word: q.word ?? q.question,
          meaning: q.word ? (q.wordMeaning ?? "") : q.choices[q.answerIndex],
        });
      }),
      6,
    );
    return results.filter((r) => r.status === "fulfilled").length;
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: material.title }} />
      <View style={{ borderRadius: 20, overflow: "hidden" }}>
        <SceneImage scene={MATERIAL_SCENES[material.slug] ?? "report"} style={{ height: 190 }} />
      </View>
      <Badge tone="signal" label={LEVEL_LABELS[(material.level as MaterialLevel) ?? "beginner"]} />
      <Text variant="title">{material.title}</Text>
      <Text>{material.description}</Text>

      <Card style={{ gap: 16 }}>
        <AudioPlayer materialId={material.id} />
        <Pressable
          onPress={() => setShowScript((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: showScript }}
          style={styles.toggle}
        >
          <Text variant="small" tone="signal" weight="600" style={{ flex: 1 }}>
            スクリプトを{showScript ? "閉じる" : "表示"}
          </Text>
          <ChevronDown
            size={16}
            color={colors.signal}
            style={{ transform: [{ rotate: showScript ? "180deg" : "0deg" }] }}
          />
        </Pressable>
        {showScript &&
          (dialogue.length > 0 ? (
            <DialogueTranscript dialogue={dialogue} />
          ) : (
            <Text variant="small" selectable>
              {material.script}
            </Text>
          ))}
      </Card>

      <VocabList materialId={material.id} materialTitle={material.title} vocab={vocab} isLoggedIn={!!user} />

      {quiz.length > 0 && (
        <Card style={{ gap: 16 }}>
          <View style={{ gap: 4 }}>
            <Text variant="heading">理解度テスト</Text>
            <Text variant="small">音声を聞いてから挑戦してみましょう。全{quiz.length}問。</Text>
          </View>
          <ChoiceQuiz
            questions={quiz.map((q) => ({ prompt: q.question, choices: q.choices, answerIndex: q.answerIndex }))}
            isLoggedIn={!!user}
            onSaveMissed={saveMissed}
          />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: "row", alignItems: "center" },
});
