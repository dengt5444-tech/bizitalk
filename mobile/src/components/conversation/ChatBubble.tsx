import { Play } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { Text } from "@/components/ui";
import { useColors } from "@/theme";

export function ChatBubble({
  role,
  text,
  personaName,
  onPlay,
}: {
  role: "user" | "assistant";
  text: string;
  personaName: string;
  onPlay?: () => void;
}) {
  const colors = useColors();
  const isUser = role === "user";
  return (
    <View style={[styles.row, { justifyContent: isUser ? "flex-end" : "flex-start" }]}>
      {!isUser && <Avatar name={personaName} size="sm" />}
      <View style={[styles.bubble, { backgroundColor: isUser ? colors.signal : colors.paperDim }]}>
        <Text variant="small" selectable style={{ color: isUser ? colors.onSignal : colors.ink, fontSize: 14.5 }}>
          {text}
        </Text>
      </View>
      {!isUser && onPlay && (
        <Pressable onPress={onPlay} accessibilityLabel="音声を再生" hitSlop={10}>
          <Play size={14} color={colors.inkFaint} fill={colors.inkFaint} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  bubble: { maxWidth: "78%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
});
