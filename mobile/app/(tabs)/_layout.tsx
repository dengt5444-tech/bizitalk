import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router/js-tabs";
import React from "react";
import type { ColorValue } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

type IconName = keyof typeof Ionicons.glyphMap;

function TabIcon({ name, color, size }: { name: IconName; color: ColorValue; size: number }) {
  return <Ionicons name={name} color={color} size={size} />;
}

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.paper },
        headerTintColor: theme.colors.ink,
        headerTitleStyle: { fontFamily: theme.fonts.display.semibold },
        headerShadowVisible: false,
        tabBarActiveTintColor: theme.colors.signal,
        tabBarInactiveTintColor: theme.colors.inkFaint,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.line,
        },
        tabBarLabelStyle: { fontFamily: theme.fonts.sans.medium, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "ホーム",
          tabBarIcon: ({ color, size }) => <TabIcon name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="conversation"
        options={{
          title: "AI会話",
          headerShown: false,
          tabBarIcon: ({ color, size }) => <TabIcon name="mic-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="materials"
        options={{
          title: "リスニング",
          headerShown: false,
          tabBarIcon: ({ color, size }) => <TabIcon name="headset-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="vocabulary"
        options={{
          title: "単語帳",
          headerShown: false,
          tabBarIcon: ({ color, size }) => <TabIcon name="book-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: "復習",
          tabBarIcon: ({ color, size }) => <TabIcon name="albums-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: "マイページ",
          headerShown: false,
          tabBarIcon: ({ color, size }) => <TabIcon name="person-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
