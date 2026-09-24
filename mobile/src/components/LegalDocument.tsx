import { View } from "react-native";
import { Screen, Text } from "./ui";

export type LegalSection = { heading: string; paragraphs: string[]; bullets?: string[]; after?: string[] };

export function LegalDocument({ updated, intro, sections }: { updated?: string; intro?: string; sections: LegalSection[] }) {
  return (
    <Screen contentStyle={{ gap: 22 }}>
      {updated && <Text variant="caption">最終更新日: {updated}</Text>}
      {intro && <Text variant="small">{intro}</Text>}
      {sections.map((section) => (
        <View key={section.heading} style={{ gap: 8 }}>
          <Text variant="heading">{section.heading}</Text>
          {section.paragraphs.map((p, i) => (
            <Text key={i} variant="small" selectable>
              {p}
            </Text>
          ))}
          {section.bullets?.map((b) => (
            <Text key={b} variant="small">
              ・{b}
            </Text>
          ))}
          {section.after?.map((p, i) => (
            <Text key={`after-${i}`} variant="small" selectable>
              {p}
            </Text>
          ))}
        </View>
      ))}
    </Screen>
  );
}
