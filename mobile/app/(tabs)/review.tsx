import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, View } from "react-native";
import { ReviewWordsView } from "@/components/review/ReviewWordsView";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { ScreenScroll } from "@/components/ui/ScreenContainer";
import { SkeletonList } from "@/components/ui/Skeleton";
import { Heading, Text } from "@/components/ui/Text";
import { useAuth } from "@/context/AuthProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { listReviewWords, type ReviewWord } from "@/lib/queries/review";

export default function ReviewScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, initializing } = useAuth();
  const [words, setWords] = useState<ReviewWord[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loadErrorDetail, setLoadErrorDetail] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(() => {
    if (!user) return Promise.resolve();
    return listReviewWords()
      .then((data) => {
        setWords(data);
        setLoadError(false);
        setLoadErrorDetail("");
      })
      .catch((err) => {
        setLoadError(true);
        setLoadErrorDetail(err instanceof Error ? err.message : "");
      });
  }, [user]);

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

  const header = (
    <View style={{ gap: 6 }}>
      <Text eyebrow color="signal" weight="medium">
        Review
      </Text>
      <Heading level={1}>復習リスト</Heading>
      <Text color="inkSoft" style={{ lineHeight: 20 }}>
        AI会話のフィードバックで出てきた単語や、リスニング教材の理解度テストで間違えた単語を、ここでまとめて復習できます。
      </Text>
    </View>
  );

  if (initializing) {
    return (
      <ScreenScroll contentContainerStyle={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </ScreenScroll>
    );
  }

  if (!user) {
    return (
      <ScreenScroll contentContainerStyle={{ gap: 20 }}>
        {header}
        <Card style={{ alignItems: "center", gap: 8, paddingVertical: 28 }}>
          <Text weight="medium">ログインすると復習リストが使えます</Text>
          <Button label="ログイン" onPress={() => router.push("/login")} />
        </Card>
      </ScreenScroll>
    );
  }

  if (!words) {
    if (loadError) {
      return (
        <ScreenScroll contentContainerStyle={{ gap: 20 }}>
          {header}
          <ErrorState onRetry={reload} message={loadErrorDetail || undefined} />
        </ScreenScroll>
      );
    }
    return (
      <ScreenScroll contentContainerStyle={{ gap: 20 }}>
        {header}
        <SkeletonList count={3} />
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
      {header}

      {words.length === 0 ? (
        <Card style={{ alignItems: "center", gap: 10, paddingVertical: 32, borderStyle: "dashed" }}>
          <Text weight="medium">保存された単語はまだありません</Text>
          <Text size={13} color="inkSoft" style={{ textAlign: "center" }}>
            AI会話を終えたあとのフィードバックや、教材の理解度テストから「復習に追加」してみましょう。
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
            <Button label="会話練習へ" onPress={() => router.push("/(tabs)/conversation")} />
            <Button label="教材一覧へ" variant="secondary" onPress={() => router.push("/(tabs)/materials")} />
          </View>
        </Card>
      ) : (
        <ReviewWordsView
          words={words}
          onRemove={(id) => setWords((prev) => (prev ? prev.filter((w) => w.id !== id) : prev))}
        />
      )}
    </ScreenScroll>
  );
}
