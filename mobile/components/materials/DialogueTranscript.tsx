import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import type { DialogueLine } from "@/lib/materials";
import { useTheme } from "@/theme/ThemeProvider";

export function DialogueTranscript({ dialogue }: { dialogue: DialogueLine[] }) {
  const theme = useTheme();

  return (
    <View style={{ gap: 8 }}>
      {dialogue.map((line, i) => {
        const tint = line.speaker === "A" ? theme.colors.signalTint : theme.colors.amberTint;
        const badge = line.speaker === "A" ? theme.colors.signal : theme.colors.amber;
        const textColor = line.speaker === "A" ? theme.colors.signalDim : theme.colors.amberDim;

        return (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 10,
              backgroundColor: tint,
              borderRadius: 12,
              padding: 12,
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: badge,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text size={11} weight="bold" color="paper">
                {line.speaker}
              </Text>
            </View>
            <Text size={14} style={{ flex: 1, color: textColor, lineHeight: 20 }}>
              {line.text}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
