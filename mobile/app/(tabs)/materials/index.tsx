import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, View } from "react-native";
import { PressableCard } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { ScreenScroll } from "@/components/ui/ScreenContainer";
import { SkeletonList } from "@/components/ui/Skeleton";
import { Heading, Text } from "@/components/ui/Text";
import { useTheme } from "@/theme/ThemeProvider";
import { LEVEL_LABELS, LEVEL_ORDER, type MaterialLevel, type MaterialSummary } from "@/lib/materials";
import { listMaterials } from "@/lib/queries/materials";

export default function MaterialsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [materials, setMaterials] = useState<MaterialSummary[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(() => {
    return listMaterials()
      .then((data) => {
        setMaterials(data);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
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

  const grouped = useCallback(() => {
    const groups = new Map<MaterialLevel, MaterialSummary[]>();
    for (const level of LEVEL_ORDER) groups.set(level, []);
    for (const material of materials ?? []) {
      const level = material.level ?? "beginner";
      groups.get(level)?.push(material);
    }
    return groups;
  }, [materials]);

  if (!materials) {
    if (loadError) {
      return (
        <ScreenScroll contentContainerStyle={{ gap: 28 }}>
          <ErrorState onRetry={reload} />
        </ScreenScroll>
      );
    }
    return (
      <ScreenScroll contentContainerStyle={{ gap: 28 }}>
        <SkeletonList count={4} />
      </ScreenScroll>
    );
  }

  const groups = grouped();

  return (
    <ScreenScroll
      contentContainerStyle={{ gap: 28 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.signal} />
      }
    >
      <View>
        <Text eyebrow color="signal" weight="medium">
          Listening
        </Text>
        <Heading level={1} style={{ marginTop: 6 }}>
          リスニング教材一覧
        </Heading>
        <Text color="inkSoft" style={{ marginTop: 6, lineHeight: 20 }}>
          初級から超上級のビジネス英語まで、全教材いつでも無料で聞き放題です。
        </Text>
      </View>

      {loadError && (
        <Text size={13} color="rose">
          最新の情報を取得できませんでした。表示中の内容は古い可能性があります。
        </Text>
      )}

      {LEVEL_ORDER.map((level) => {
        const items = groups.get(level) ?? [];
        if (items.length === 0) return null;

        return (
          <View key={level} style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
              <Heading level={3}>{LEVEL_LABELS[level]}</Heading>
              <Text size={13} color="inkFaint">
                {items.length}本
              </Text>
            </View>

            {items.map((material) => (
              <PressableCard
                key={material.id}
                onPress={() => router.push(`/(tabs)/materials/${material.slug}`)}
                style={{ gap: 8 }}
              >
                <Text weight="semibold">{material.title}</Text>
                <Text size={13} color="inkSoft" style={{ lineHeight: 18 }}>
                  {material.description}
                </Text>
                <Text size={13} color="signal" weight="medium">
                  再生する →
                </Text>
              </PressableCard>
            ))}
          </View>
        );
      })}
    </ScreenScroll>
  );
}
