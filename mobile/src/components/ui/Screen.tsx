import type { ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/theme";

// Page wrapper for every screen: paper background, comfortable side
// padding, optional pull-to-refresh. `topInset` is for tab screens, which
// have no navigation header above them to clear the status bar.
export function Screen({
  children,
  refreshing,
  onRefresh,
  topInset = false,
  scroll = true,
  contentStyle,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  topInset?: boolean;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const padding = [styles.content, topInset && { paddingTop: insets.top + 16 }, contentStyle];

  if (!scroll) {
    return <View style={[styles.fill, { backgroundColor: colors.paper }, padding]}>{children}</View>;
  }

  return (
    <ScrollView
      style={[styles.fill, { backgroundColor: colors.paper }]}
      contentContainerStyle={[padding, { paddingBottom: insets.bottom + 40 }]}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="never"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.signal} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, gap: 16 },
});
