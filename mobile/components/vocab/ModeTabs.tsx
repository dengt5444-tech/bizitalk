import React from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/theme/ThemeProvider";

export function ModeTabs<T extends string>({
  modes,
  active,
  onChange,
}: {
  modes: { key: T; label: string }[];
  active: T;
  onChange: (mode: T) => void;
}) {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {modes.map((m) => {
        const isActive = m.key === active;
        return (
          <Pressable
            key={m.key}
            onPress={() => onChange(m.key)}
            style={{
              borderRadius: 999,
              paddingHorizontal: 16,
              paddingVertical: 9,
              backgroundColor: isActive ? theme.colors.signal : "transparent",
              borderWidth: isActive ? 0 : 1,
              borderColor: theme.colors.line,
            }}
          >
            <Text size={13} weight="medium" color={isActive ? "paper" : "inkSoft"}>
              {m.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
