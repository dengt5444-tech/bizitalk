import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { AudioPlayer } from "@/components/materials/AudioPlayer";
import { DialogueTranscript } from "@/components/materials/DialogueTranscript";
import { Quiz } from "@/components/materials/Quiz";
import { VocabList } from "@/components/materials/VocabList";
import { LockCard } from "@/components/LockCard";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { ScreenScroll } from "@/components/ui/ScreenContainer";
import { Heading, Text } from "@/components/ui/Text";
import { useAuth } from "@/context/AuthProvider";
import { isListeningEntitled } from "@/lib/entitlements";
import { LEVEL_LABELS, type MaterialDetail } from "@/lib/materials";
import { getMaterialBySlug } from "@/lib/queries/materials";

export default function MaterialDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();
  const [material, setMaterial] = useState<MaterialDetail | null | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [showScript, setShowScript] = useState(false);

  const reload = useCallback(() => {
    if (typeof slug !== "string") return Promise.resolve();
    return getMaterialBySlug(slug)
      .then((data) => {
        setMaterial(data);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
  }, [slug]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    isListeningEntitled(user?.id).then(setSubscribed);
  }, [user]);

  if (material === undefined) {
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

  if (!material) {
    return (
      <ScreenScroll>
        <Text>教材が見つかりませんでした。</Text>
      </ScreenScroll>
    );
  }

  const unlocked = material.is_free || subscribed;

  return (
    <ScreenScroll contentContainerStyle={{ gap: 16 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Badge label={LEVEL_LABELS[material.level] ?? "初級"} accent="signal" />
        {material.is_free && <Badge label="無料お試し" accent="amber" />}
      </View>

      <View>
        <Heading level={2}>{material.title}</Heading>
        <Text color="inkSoft" style={{ marginTop: 6, lineHeight: 20 }}>
          {material.description}
        </Text>
      </View>

      {unlocked ? (
        <>
          <Card style={{ gap: 12 }}>
            <AudioPlayer materialId={material.id} />
            <Pressable onPress={() => setShowScript((v) => !v)}>
              <Text weight="semibold" color="signal" size={14}>
                {showScript ? "スクリプトを隠す" : "スクリプトを表示"}
              </Text>
            </Pressable>
            {showScript &&
              (material.dialogue.length > 0 ? (
                <DialogueTranscript dialogue={material.dialogue} />
              ) : (
                <Text color="inkSoft" style={{ lineHeight: 20 }}>
                  {material.script}
                </Text>
              ))}
          </Card>

          <VocabList
            materialId={material.id}
            materialTitle={material.title}
            vocab={material.vocab}
            isLoggedIn={!!user}
          />

          <Quiz
            materialId={material.id}
            materialTitle={material.title}
            questions={material.quiz}
            isLoggedIn={!!user}
          />
        </>
      ) : (
        <LockCard isLoggedIn={!!user} />
      )}
    </ScreenScroll>
  );
}
