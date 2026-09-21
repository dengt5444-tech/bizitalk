import React from "react";
import { View } from "react-native";
import { Heading, Text } from "@/components/ui/Text";

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Heading level={4}>{title}</Heading>
      {typeof children === "string" ? (
        <Text color="inkSoft" style={{ lineHeight: 20 }}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}
