import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, View } from "react-native";
import { Badge } from "@/components/ui/Badge";
import { PressableCard } from "@/components/ui/Card";
import { ScreenScroll } from "@/components/ui/ScreenContainer";
import { SkeletonList } from "@/components/ui/Skeleton";
import { Heading, Text } from "@/components/ui/Text";
import { useAuth } from "@/context/AuthProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { isListeningEntitled } from "@/lib/entitlements";
import { LEVEL_LABELS, LEVEL_ORDER, type MaterialLevel, type MaterialSummary } from "@/lib/materials";
import { listMaterials } from "@/lib/queries/materials";

export default function MaterialsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [materials, setMaterials] = useState<MaterialSummary[] | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(() => listMaterials().then(setMaterials), []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    isListeningEntitled(user?.id).then(setSubscribed);
  }, [user]);

  async function handleRefresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
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
          無料お試しの教材から、超上級のビジネス英語まで。リスニングプランへの登録でレベルを問わず全教材が聞き放題になります。
        </Text>
      </View>

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

            {items.map((material) => {
              const unlocked = material.is_free || subscribed;
              return (
                <PressableCard
                  key={material.id}
                  onPress={() => router.push(`/(tabs)/materials/${material.slug}`)}
                  style={{ gap: 8 }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                    <Text weight="semibold" style={{ flex: 1 }}>
                      {material.title}
                    </Text>
                    {material.is_free ? (
                      <Badge label="無料" accent="amber" />
                    ) : !unlocked ? (
                      <Badge label="ロック中" accent="neutral" />
                    ) : null}
                  </View>
                  <Text size={13} color="inkSoft" style={{ lineHeight: 18 }}>
                    {material.description}
                  </Text>
                  <Text size={13} color="signal" weight="medium">
                    {unlocked ? "再生する →" : "詳細を見る →"}
                  </Text>
                </PressableCard>
              );
            })}
          </View>
        );
      })}
    </ScreenScroll>
  );
}
