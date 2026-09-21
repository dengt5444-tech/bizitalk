import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Badge } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { ScreenScroll } from "@/components/ui/ScreenContainer";
import { Heading, Text } from "@/components/ui/Text";
import { VocabDeckPractice } from "@/components/vocab/VocabDeckPractice";
import { useAuth } from "@/context/AuthProvider";
import { getVocabDeckBySlug, type VocabDeckSummary } from "@/lib/queries/vocab";

export default function VocabDeckScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();
  const [deck, setDeck] = useState<VocabDeckSummary | null | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);

  const reload = useCallback(() => {
    if (typeof slug !== "string") return Promise.resolve();
    return getVocabDeckBySlug(slug)
      .then((data) => {
        setDeck(data);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
  }, [slug]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (deck === undefined) {
    if (loadError) {
      return (
        <ScreenScroll>
          <ErrorState onRetry={reload} />
        </ScreenScroll>
      );
    }
    return (
      <ScreenScroll contentContainerStyle={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </ScreenScroll>
    );
  }

  if (!deck) {
    return (
      <ScreenScroll>
        <Text>単語帳が見つかりませんでした。</Text>
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll contentContainerStyle={{ gap: 16 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Badge label={`${deck.items.length}語`} accent="signal" />
      </View>

      <View>
        <Heading level={2}>{deck.title}</Heading>
        <Text color="inkSoft" style={{ marginTop: 6, lineHeight: 20 }}>
          {deck.description}
        </Text>
      </View>

      <VocabDeckPractice deckTitle={deck.title} words={deck.items} isLoggedIn={!!user} />
    </ScreenScroll>
  );
}
