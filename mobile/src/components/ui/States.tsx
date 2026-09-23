import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useColors } from "@/theme";
import { Button } from "./Button";
import { Text } from "./Text";

export function Loading() {
  const colors = useColors();
  return (
    <View style={[styles.center, { backgroundColor: colors.paper }]}>
      <ActivityIndicator color={colors.signal} />
    </View>
  );
}

export function ErrorState({
  message = "読み込みに失敗しました。通信環境をご確認のうえ、もう一度お試しください。",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const colors = useColors();
  return (
    <View style={[styles.center, { backgroundColor: colors.paper }]}>
      <Text center>{message}</Text>
      {onRetry && <Button title="再読み込み" variant="outline" onPress={onRetry} style={{ marginTop: 16 }} />}
    </View>
  );
}

export function EmptyState({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.empty, { backgroundColor: colors.paperDim, borderColor: colors.line }]}>
      <Text variant="body" tone="ink" weight="600" center>
        {title}
      </Text>
      {description && (
        <Text variant="small" center style={{ marginTop: 6 }}>
          {description}
        </Text>
      )}
      {children && <View style={styles.actions}>{children}</View>}
    </View>
  );
}

export function SectionHeader({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {eyebrow && <Text variant="eyebrow">{eyebrow}</Text>}
      <Text variant="display">{title}</Text>
      {description && <Text>{description}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  empty: { borderRadius: 18, borderWidth: 1, borderStyle: "dashed", padding: 28, alignItems: "center" },
  actions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 18 },
});
