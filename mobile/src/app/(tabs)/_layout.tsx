import { Tabs } from "expo-router/js-tabs";
import { BookOpen, Headphones, House, MessagesSquare, UserRound } from "lucide-react-native";
import { useColors } from "@/theme";

export default function TabLayout() {
  const colors = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.signal,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "ホーム", tabBarIcon: ({ color, size }) => <House color={color} size={size - 2} /> }}
      />
      <Tabs.Screen
        name="conversation"
        options={{
          title: "会話練習",
          tabBarIcon: ({ color, size }) => <MessagesSquare color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="materials"
        options={{
          title: "リスニング",
          tabBarIcon: ({ color, size }) => <Headphones color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="vocabulary"
        options={{ title: "単語帳", tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size - 2} /> }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: "マイページ",
          tabBarIcon: ({ color, size }) => <UserRound color={color} size={size - 2} />,
        }}
      />
    </Tabs>
  );
}
