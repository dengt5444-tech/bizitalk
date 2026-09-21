import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/theme/ThemeProvider";

export function DangerZone() {
  const theme = useTheme();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  function confirmDelete() {
    Alert.alert(
      "アカウントを削除しますか?",
      "会話の記録・復習リスト・ご登録中のプランなど、すべてのデータが完全に削除されます。この操作は取り消せません。有料プランをご利用中の場合は、サブスクリプションも自動的に解約されます。",
      [
        { text: "キャンセル", style: "cancel" },
        { text: "削除する", style: "destructive", onPress: handleDelete },
      ],
    );
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.post("/api/account/delete");
      await supabase.auth.signOut();
      router.replace("/(tabs)");
    } catch {
      Alert.alert("削除に失敗しました", "しばらくしてからもう一度お試しいただくか、サポートまでご連絡ください。");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <View
      style={{
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.rose,
        padding: 16,
        gap: 10,
      }}
    >
      <Text weight="semibold" color="rose">
        アカウントの削除
      </Text>
      <Text size={12} color="inkSoft" style={{ lineHeight: 17 }}>
        アカウントとすべてのデータを完全に削除します。ご登録中の有料プランも解約されます。この操作は取り消せません。
      </Text>
      <Button
        label={deleting ? "削除中..." : "アカウントを削除する"}
        variant="secondary"
        loading={deleting}
        onPress={confirmDelete}
        style={{ borderColor: theme.colors.rose }}
      />
    </View>
  );
}
