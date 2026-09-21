import React from "react";
import { View } from "react-native";
import { Card } from "@/components/ui/Card";
import { Heading, Text } from "@/components/ui/Text";

type Accent = "signal" | "mint" | "violet" | "amber";

const ACCENT_COLOR: Record<Accent, "signal" | "mintDim" | "violetDim" | "amberDim"> = {
  signal: "signal",
  mint: "mintDim",
  violet: "violetDim",
  amber: "amberDim",
};

export function StatTile({
  label,
  value,
  unit,
  accent = "signal",
}: {
  label: string;
  value: string;
  unit: string;
  accent?: Accent;
}) {
  return (
    <Card style={{ flexBasis: "47%", flexGrow: 1, gap: 6 }}>
      <Text size={12} color="inkFaint">
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
        <Heading level={2} color={ACCENT_COLOR[accent]}>
          {value}
        </Heading>
        <Text size={13} color="inkFaint">
          {unit}
        </Text>
      </View>
    </Card>
  );
}
