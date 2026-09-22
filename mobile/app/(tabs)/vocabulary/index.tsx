import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, View } from "react-native";
import { Badge } from "@/components/ui/Badge";
import { PressableCard } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { ScreenScroll } from "@/components/ui/ScreenContainer";
import { SkeletonList } from "@/components/ui/Skeleton";
import { Heading, Text } from "@/components/ui/Text";
import { useTheme } from "@/theme/ThemeProvider";
import { listVocabDecks, type VocabDeckSummary } from "@/lib/queries/vocab";

export default function VocabularyScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [decks, setDecks] = useState<VocabDeckSummary[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loadErrorDetail, setLoadErrorDetail] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(() => {
    return listVocabDecks()
      .then((data) => {
        setDecks(data);
        setLoadError(false);
        setLoadErrorDetail("");
      })
      .catch((err) => {
        setLoadError(true);
        setLoadErrorDetail(err instanceof Error ? err.message : "");
      });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }

  if (!decks) {
    if (loadError) {
      return (
        <ScreenScroll contentContainerStyle={{ gap: 20 }}>
          <ErrorState onRetry={reload} message={loadErrorDetail || undefined} />
        </ScreenScroll>
      );
    }
    return (
      <ScreenScroll contentContainerStyle={{ gap: 20 }}>
        <SkeletonList count={4} />
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll
      contentContainerStyle={{ gap: 20 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.signal} />
      }
    >
      <View>
        <Text eyebrow color="signal" weight="medium">
          Vocabulary
        </Text>
        <Heading level={1} style={{ marginTop: 6 }}>
          単語帳
        </Heading>
        <Text color="inkSoft" style={{ marginTop: 6, lineHeight: 20 }}>
          外資系企業でよく使われるビジネス英単語や、ワーキングホリデーの職場で役立つ実務英語をテーマ別に学べます。フラッシュカードと4択テストで、覚えたかどうかその場で確認できます。すべて無料でご利用いただけます。
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        {decks.map((deck) => (
          <PressableCard
            key={deck.id}
            onPress={() => router.push(`/(tabs)/vocabulary/${deck.slug}`)}
            style={{ gap: 8 }}
          >
            <Badge label={`${deck.items.length}語`} accent="neutral" />
            <Text weight="semibold">{deck.title}</Text>
            <Text size={13} color="inkSoft" style={{ lineHeight: 18 }}>
              {deck.description}
            </Text>
            <Text size={13} color="signal" weight="medium">
              学習する →
            </Text>
          </PressableCard>
        ))}
      </View>
    </ScreenScroll>
  );
}
