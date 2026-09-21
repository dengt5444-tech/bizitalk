import { Lightbulb, RotateCw } from "lucide-react-native";
import React from "react";
import { ActivityIndicator, Pressable, View, type ViewStyle } from "react-native";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/theme/ThemeProvider";

// "Guided mode" hint: a concrete example of what the learner could say
// next. A flat tonal card (no left accent rail) with a leading icon —
// matches the tonal-container convention Material 3 uses for this kind of
// inline assistive content, in Harbor's own signal-blue tint.
export function HintCard({
  reply,
  gloss,
  loading,
  onRefresh,
  style,
}: {
  reply: string | null;
  gloss: string | null;
  loading: boolean;
  onRefresh: () => void;
  style?: ViewStyle;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        { borderRadius: theme.radius.md, backgroundColor: theme.colors.signalTint, padding: 14, gap: 6 },
        style,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Lightbulb size={16} color={theme.colors.signal} strokeWidth={2} />
        <Text size={11} weight="medium" color="signal" eyebrow style={{ flex: 1 }}>
          こう言ってみましょう
        </Text>
        <Pressable onPress={onRefresh} disabled={loading} hitSlop={8}>
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.signal} />
          ) : (
            <RotateCw size={15} color={theme.colors.signal} strokeWidth={2} />
          )}
        </Pressable>
      </View>
      {!!reply && (
        <Text weight="medium" size={15} style={{ lineHeight: 21 }}>
          {reply}
        </Text>
      )}
      {!!gloss && (
        <Text size={12} color="inkSoft" style={{ lineHeight: 17 }}>
          {gloss}
        </Text>
      )}
    </View>
  );
}
