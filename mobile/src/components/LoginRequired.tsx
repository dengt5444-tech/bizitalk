import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useColors } from "@/theme";
import { Button, Text } from "./ui";

export function LoginRequired({ message }: { message: string }) {
  const colors = useColors();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.paper }]}>
      <Text variant="title" center>
        ログインが必要です
      </Text>
      <Text center>{message}</Text>
      <Button title="ログイン" onPress={() => router.push("/login")} style={{ alignSelf: "stretch", marginTop: 8 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", padding: 28, gap: 12 },
});
