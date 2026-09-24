import { router } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { Badge, Card, ErrorState, Loading, Screen, SectionHeader, Text } from "@/components/ui";
import { fetchDecks } from "@/lib/queries";
import { useAsync } from "@/lib/useAsync";
import { useColors } from "@/theme";

export default function VocabularyScreen() {
  const colors = useColors();
  const { data, error, loading, refreshing, refresh, reload } = useAsync(fetchDecks, []);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  return (
    <Screen topInset refreshing={refreshing} onRefresh={refresh}>
      <SectionHeader
        eyebrow="Vocabulary"
        title="単語帳"
        description="外資系企業でよく使われるビジネス英単語や、ワーキングホリデーの職場で役立つ実務英語をテーマ別に学べます。フラッシュカードと4択テストで、覚えたかどうかその場で確認できます。すべて無料でご利用いただけます。"
      />
      {(data ?? []).map((deck) => {
        const wordCount = Array.isArray(deck.items) ? deck.items.length : 0;
        return (
          <Card
            key={deck.id}
            onPress={() => router.push(`/vocabulary/${deck.slug}`)}
            accessibilityLabel={deck.title}
            style={{ gap: 8 }}
          >
            <Badge label={`${wordCount}語`} />
            <Text variant="heading">{deck.title}</Text>
            <Text variant="small">{deck.description}</Text>
            <View style={styles.link}>
              <Text variant="small" tone="signal" weight="600">
                学習する
              </Text>
              <ArrowRight size={15} color={colors.signal} />
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: { flexDirection: "row", alignItems: "center", gap: 4 },
});
