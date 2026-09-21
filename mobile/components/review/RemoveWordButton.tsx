import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable } from "react-native";
import { api } from "@/lib/api";
import { useTheme } from "@/theme/ThemeProvider";

export function RemoveWordButton({
  id,
  source,
  onRemoved,
}: {
  id: string;
  source: "conversation" | "listening";
  onRemoved: () => void;
}) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);

  async function handlePress() {
    setLoading(true);
    const endpoint = source === "listening" ? `/api/review/listening-words/${id}` : `/api/review/words/${id}`;
    try {
      await api.delete(endpoint);
      onRemoved();
    } catch {
      Alert.alert("削除に失敗しました", "通信環境をご確認のうえ、もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={loading}
      style={{
        borderWidth: 1,
        borderColor: theme.colors.line,
        borderRadius: 999,
        width: 32,
        height: 32,
        alignItems: "center",
        justifyContent: "center",
        opacity: loading ? 0.5 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.rose} />
      ) : (
        <Ionicons name="trash-outline" size={15} color={theme.colors.rose} />
      )}
    </Pressable>
  );
}
