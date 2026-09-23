import { router, useFocusEffect } from "expo-router";
import { ArrowLeft, ArrowRight } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { LoginRequired } from "@/components/LoginRequired";
import { Flashcards } from "@/components/practice/Flashcards";
import { Button, EmptyState, ErrorState, Loading, Screen, SectionHeader, Text } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fetchReviewWords, type ReviewWord } from "@/lib/queries";
import { useAsync } from "@/lib/useAsync";
import { useColors } from "@/theme";

export default function ReviewScreen() {
  const { user } = useAuth();
  if (!user) return <LoginRequired message="復習リストを見るにはログインしてください。" />;
  return <ReviewList />;
}

function ReviewList() {
  const colors = useColors();
  const { data, error, loading, refreshing, refresh, reload } = useAsync(fetchReviewWords, []);
  const [mode, setMode] = useState<"list" | "flashcards">("list");
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh on focus only
    }, []),
  );

  const words = useMemo(() => (data ?? []).filter((w) => !removed.has(`${w.source}:${w.id}`)), [data, removed]);
  const groups = useMemo(() => {
    const map = new Map<string, ReviewWord[]>();
    for (const w of words) {
      const list = map.get(w.groupTitle) ?? [];
      list.push(w);
      map.set(w.groupTitle, list);
    }
    return Array.from(map.entries());
  }, [words]);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  async function remove(word: ReviewWord) {
    const key = `${word.source}:${word.id}`;
    setRemoved((prev) => new Set(prev).add(key));
    try {
      await api.delete(word.source === "listening" ? `/api/review/listening-words/${word.id}` : `/api/review/words/${word.id}`);
    } catch {
      setRemoved((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      Alert.alert("削除できませんでした", "通信環境をご確認のうえ、もう一度お試しください。");
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <SectionHeader
        eyebrow="Review"
        title="復習リスト"
        description="AI会話のフィードバックで出てきた単語や、リスニング教材の理解度テストで間違えた単語を、ここでまとめて復習できます。"
      />
      {words.length === 0 ? (
        <EmptyState
          title="保存された単語はまだありません"
          description="AI会話を終えたあとのフィードバックや、教材の理解度テストから「復習に追加」してみましょう。"
        >
          <Button title="会話練習へ" size="sm" onPress={() => router.navigate("/conversation")} />
          <Button title="教材一覧へ" size="sm" variant="outline" onPress={() => router.navigate("/materials")} />
        </EmptyState>
      ) : (
        <>
          <View style={styles.bar}>
            <Text variant="small">全{words.length}語</Text>
            <Button
              size="sm"
              title={mode === "list" ? "フラッシュカードで復習する" : "リスト表示に戻る"}
              icon={
                mode === "list" ? (
                  <ArrowRight size={15} color={colors.onSignal} />
                ) : (
                  <ArrowLeft size={15} color={colors.onSignal} />
                )
              }
              onPress={() => setMode(mode === "list" ? "flashcards" : "list")}
            />
          </View>
          {mode === "flashcards" ? (
            <Flashcards
              items={words.map((w) => ({ key: `${w.source}:${w.id}`, front: w.word, frontLabel: w.groupTitle, back: w.meaning }))}
              doneMessage="復習お疲れさまでした!"
            />
          ) : (
            groups.map(([groupTitle, items]) => (
              <View key={groupTitle} style={{ gap: 8 }}>
                <Text variant="eyebrow" tone="inkFaint">
                  {groupTitle}
                </Text>
                {items.map((item) => (
                  <View key={`${item.source}:${item.id}`} style={[styles.row, { borderColor: colors.line, backgroundColor: colors.surface }]}>
                    <View style={{ flex: 1 }}>
                      <Text variant="body" tone="ink" weight="600" selectable>
                        {item.word}
                      </Text>
                      {item.meaning ? <Text variant="small">{item.meaning}</Text> : null}
                    </View>
                    <Button title="削除" size="sm" variant="outline" onPress={() => remove(item)} />
                  </View>
                ))}
              </View>
            ))
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
});
