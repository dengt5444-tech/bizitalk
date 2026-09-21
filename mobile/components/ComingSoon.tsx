import React from "react";
import { ScreenView } from "@/components/ui/ScreenContainer";
import { Heading, Text } from "@/components/ui/Text";

export function ComingSoon({ title }: { title: string }) {
  return (
    <ScreenView style={{ alignItems: "center", justifyContent: "center", gap: 8 }}>
      <Heading level={3}>{title}</Heading>
      <Text color="inkSoft" style={{ textAlign: "center" }}>
        この画面は準備中です。
      </Text>
    </ScreenView>
  );
}
