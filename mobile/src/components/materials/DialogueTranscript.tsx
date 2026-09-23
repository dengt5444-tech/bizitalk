import { StyleSheet, View } from "react-native";
import { Text } from "@/components/ui";
import type { DialogueLine } from "@/lib/materials";
import { useColors } from "@/theme";

export function DialogueTranscript({ dialogue }: { dialogue: DialogueLine[] }) {
  const colors = useColors();
  const style = {
    A: { bg: colors.signalTint, fg: colors.signalDim, badge: colors.signal },
    B: { bg: colors.amberTint, fg: colors.amberDim, badge: colors.amber },
  };
  return (
    <View style={{ gap: 8 }}>
      {dialogue.map((line, i) => {
        const s = style[line.speaker] ?? style.A;
        return (
          <View key={i} style={[styles.line, { backgroundColor: s.bg }]}>
            <View style={[styles.badge, { backgroundColor: s.badge }]}>
              <Text variant="caption" weight="700" style={{ color: colors.paper }}>
                {line.speaker}
              </Text>
            </View>
            <Text variant="small" selectable style={{ flex: 1, color: s.fg }}>
              {line.text}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: "row", gap: 10, borderRadius: 14, padding: 12, alignItems: "flex-start" },
  badge: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
