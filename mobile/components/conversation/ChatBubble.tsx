import React from "react";
import { View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { Text } from "@/components/ui/Text";
import type { ConversationTurn } from "@/lib/conversation";
import { useTheme } from "@/theme/ThemeProvider";

export function ChatBubble({ turn, personaName }: { turn: ConversationTurn; personaName: string }) {
  const theme = useTheme();
  const isUser = turn.role === "user";

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: isUser ? "flex-end" : "flex-start",
        alignItems: "flex-end",
        gap: 8,
      }}
    >
      {!isUser && <Avatar name={personaName} size="sm" />}
      <View
        style={{
          maxWidth: "75%",
          borderRadius: 16,
          paddingHorizontal: 14,
          paddingVertical: 10,
          backgroundColor: isUser ? theme.colors.signal : theme.colors.paperDim,
        }}
      >
        <Text size={14} style={{ color: isUser ? theme.colors.paper : theme.colors.ink, lineHeight: 19 }}>
          {turn.text}
        </Text>
      </View>
    </View>
  );
}
