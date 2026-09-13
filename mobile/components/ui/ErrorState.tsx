import React from "react";
import { Button } from "./Button";
import { Card } from "./Card";
import { Text } from "./Text";

export function ErrorState({
  onRetry,
  message = "読み込みに失敗しました。通信環境をご確認のうえ、もう一度お試しください。",
}: {
  onRetry: () => void;
  message?: string;
}) {
  return (
    <Card style={{ alignItems: "center", gap: 10, paddingVertical: 28 }}>
      <Text weight="medium" style={{ textAlign: "center" }}>
        {message}
      </Text>
      <Button label="再読み込み" variant="secondary" onPress={onRetry} />
    </Card>
  );
}
