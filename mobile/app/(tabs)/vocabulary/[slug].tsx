import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { LockCard } from "@/components/LockCard";
import { Badge } from "@/components/ui/Badge";
import { ScreenScroll } from "@/components/ui/ScreenContainer";
import { Heading, Text } from "@/components/ui/Text";
import { VocabDeckPractice } from "@/components/vocab/VocabDeckPractice";
import { useAuth } from "@/context/AuthProvider";
import { isListeningEntitled } from "@/lib/entitlements";
import { getVocabDeckBySlug, type VocabDeckSummary } from "@/lib/queries/vocab";

export default function VocabDeckScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();
  const [deck, setDeck] = useState<VocabDeckSummary | null | undefined>(undefined);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (typeof slug === "string") getVocabDeckBySlug(slug).then(setDeck);
  }, [slug]);

  useEffect(() => {
    isListeningEntitled(user?.id).then(setSubscribed);
  }, [user]);

  if (deck === undefined) {
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

  const unlocked = deck.is_free || subscribed;

  return (
    <ScreenScroll contentContainerStyle={{ gap: 16 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Badge label={`${deck.items.length}語`} accent="signal" />
        {deck.is_free && <Badge label="無料お試し" accent="amber" />}
      </View>

      <View>
        <Heading level={2}>{deck.title}</Heading>
        <Text color="inkSoft" style={{ marginTop: 6, lineHeight: 20 }}>
          {deck.description}
        </Text>
      </View>

      {unlocked ? (
        <VocabDeckPractice deckTitle={deck.title} words={deck.items} isLoggedIn={!!user} />
      ) : (
        <LockCard isLoggedIn={!!user} />
      )}
    </ScreenScroll>
  );
}
