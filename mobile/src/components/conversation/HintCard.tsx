import { Lightbulb, RotateCw } from "lucide-react-native";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui";
import { useColors } from "@/theme";

// "Guided mode" hint: a concrete example of what the learner could say next.
export function HintCard({
  reply,
  gloss,
  loading,
  onRefresh,
}: {
  reply: string | null;
  gloss: string | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.signalTint }]}>
      <View style={styles.header}>
        <Lightbulb size={16} color={colors.signalDim} />
        <Text variant="caption" weight="600" style={{ flex: 1, color: colors.signalDim, letterSpacing: 1 }}>
          こう言ってみましょう
        </Text>
        <Pressable onPress={onRefresh} disabled={loading} accessibilityLabel="別の例文を見る" hitSlop={10}>
          {loading ? <ActivityIndicator size="small" color={colors.signalDim} /> : <RotateCw size={15} color={colors.signalDim} />}
        </Pressable>
      </View>
      {reply && (
        <Text variant="small" tone="ink" weight="600" selectable>
          {reply}
        </Text>
      )}
      {gloss && <Text variant="caption" tone="inkSoft">{gloss}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 14, gap: 6 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
});
