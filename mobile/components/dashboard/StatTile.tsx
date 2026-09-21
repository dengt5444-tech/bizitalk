import React from "react";
import { View } from "react-native";
import { Card } from "@/components/ui/Card";
import { Heading, Text } from "@/components/ui/Text";

export function StatTile({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <Card style={{ flexBasis: "47%", flexGrow: 1, gap: 6 }}>
      <Text size={12} color="inkFaint">
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
        <Heading level={2}>{value}</Heading>
        <Text size={13} color="inkFaint">
          {unit}
        </Text>
      </View>
    </Card>
  );
}
