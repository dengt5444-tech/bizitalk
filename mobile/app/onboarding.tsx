import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Headphones, Mic, Sparkles, type LucideIcon } from "lucide-react-native";
import React, { useCallback, useRef, useState } from "react";
import { Dimensions, FlatList, Pressable, View, type ViewToken } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { markOnboardingSeen } from "@/lib/onboarding";
import { useTheme } from "@/theme/ThemeProvider";

const { width } = Dimensions.get("window");
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 60 };

const SLIDES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Mic,
    title: "AIとリアルタイム音声で\n会話練習",
    description: "CEO、海外の同僚、取引先——相手役・シチュエーション別に、実際のビジネスシーンに近い形で話す練習ができます。",
  },
  {
    icon: Sparkles,
    title: "会話ごとにAIコーチが\nフィードバック",
    description: "文法・語彙・丁寧さをスコアリングし、良かった表現と直すと良い表現を具体的に教えてくれます。",
  },
  {
    icon: Headphones,
    title: "リスニングと単語帳も\n聞き放題・学び放題",
    description: "ビジネス英語のリスニング教材と、テーマ別の単語帳。苦手な単語は自動で復習リストに貯まります。",
  },
];

export default function OnboardingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const listRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index !== null && viewableItems[0]?.index !== undefined) {
      setIndex(viewableItems[0].index);
    }
  }, []);

  async function finish() {
    await markOnboardingSeen();
    router.replace("/(tabs)");
  }

  function next() {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1 });
    } else {
      finish();
    }
  }

  return (
    <LinearGradient
      colors={[theme.colors.ink, theme.colors.signalDim]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1, justifyContent: "center", paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <FlatList
          ref={listRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.title}
          viewabilityConfig={VIEWABILITY_CONFIG}
          onViewableItemsChanged={onViewableItemsChanged}
          renderItem={({ item }) => (
            <View style={{ width, paddingHorizontal: 36, alignItems: "center", gap: 20 }}>
              <View
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255,255,255,0.12)",
                }}
              >
                <item.icon size={40} color={theme.colors.paper} strokeWidth={1.75} />
              </View>
              <Text
                variant="display"
                weight="semibold"
                size={26}
                style={{ color: theme.colors.paper, textAlign: "center", lineHeight: 34 }}
              >
                {item.title}
              </Text>
              <Text style={{ color: theme.colors.inkFaint, textAlign: "center", lineHeight: 21 }}>
                {item.description}
              </Text>
            </View>
          )}
        />
      </View>

      <View style={{ paddingHorizontal: 28, paddingBottom: insets.bottom + 24, gap: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
          {SLIDES.map((slide, i) => (
            <View
              key={slide.title}
              style={{
                width: i === index ? 20 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: i === index ? theme.colors.signal : theme.colors.inkFaint,
              }}
            />
          ))}
        </View>

        <Button label={index === SLIDES.length - 1 ? "はじめる" : "次へ"} onPress={next} fullWidth />
        {index < SLIDES.length - 1 && (
          <Pressable onPress={finish} style={{ paddingVertical: 8 }}>
            <Text style={{ color: theme.colors.inkFaint, textAlign: "center" }} size={14}>
              スキップ
            </Text>
          </Pressable>
        )}
      </View>
    </LinearGradient>
  );
}
