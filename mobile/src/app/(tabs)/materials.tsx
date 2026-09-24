import { router } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { SceneImage } from "@/components/SceneImage";
import { Card, ErrorState, Loading, Screen, SectionHeader, Text } from "@/components/ui";
import {
  EXCLUDED_MATERIAL_SLUGS,
  LEVEL_LABELS,
  LEVEL_ORDER,
  MATERIAL_SCENES,
  type MaterialLevel,
} from "@/lib/materials";
import { fetchMaterials, type MaterialListItem } from "@/lib/queries";
import { useAsync } from "@/lib/useAsync";
import { useColors } from "@/theme";

export default function MaterialsScreen() {
  const colors = useColors();
  const { data, error, loading, refreshing, refresh, reload } = useAsync(fetchMaterials, []);

  const groups = useMemo(() => {
    const map = new Map<MaterialLevel, MaterialListItem[]>(LEVEL_ORDER.map((l) => [l, []]));
    for (const material of data ?? []) {
      if (EXCLUDED_MATERIAL_SLUGS.has(material.slug)) continue;
      map.get((material.level as MaterialLevel) ?? "beginner")?.push(material);
    }
    return map;
  }, [data]);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  return (
    <Screen topInset refreshing={refreshing} onRefresh={refresh}>
      <SectionHeader
        eyebrow="Listening"
        title="リスニング教材"
        description="初級から超上級のビジネス英語まで、全教材いつでも無料で聞き放題です。"
      />
      {LEVEL_ORDER.map((level) => {
        const items = groups.get(level) ?? [];
        if (items.length === 0) return null;
        return (
          <View key={level} style={{ gap: 12, marginTop: 8 }}>
            <View style={[styles.levelHeader, { borderBottomColor: colors.line }]}>
              <Text variant="heading" style={{ fontSize: 19 }}>
                {LEVEL_LABELS[level]}
              </Text>
              <Text variant="caption">{items.length}本</Text>
            </View>
            {items.map((material) => (
              <Card
                key={material.id}
                padded={false}
                onPress={() => router.push(`/materials/${material.slug}`)}
                accessibilityLabel={material.title}
                style={{ overflow: "hidden" }}
              >
                <SceneImage scene={MATERIAL_SCENES[material.slug] ?? "report"} style={{ height: 110 }} />
                <View style={{ padding: 16, gap: 6 }}>
                  <Text variant="heading">{material.title}</Text>
                  <Text variant="small">{material.description}</Text>
                  <View style={styles.link}>
                    <Text variant="small" tone="signal" weight="600">
                      再生する
                    </Text>
                    <ArrowRight size={15} color={colors.signal} />
                  </View>
                </View>
              </Card>
            ))}
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  levelHeader: { flexDirection: "row", alignItems: "baseline", gap: 10, paddingBottom: 10, borderBottomWidth: 1 },
  link: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
});
