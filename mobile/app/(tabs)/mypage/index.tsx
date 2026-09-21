import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { StatTile } from "@/components/dashboard/StatTile";
import { PricingPlans } from "@/components/pricing/PricingPlans";
import { DangerZone } from "@/components/settings/DangerZone";
import { SettingsLinks } from "@/components/settings/SettingsLinks";
import { Button } from "@/components/ui/Button";
import { Card, PressableCard } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { GradientHero } from "@/components/ui/GradientHero";
import { ScreenScroll } from "@/components/ui/ScreenContainer";
import { SkeletonList } from "@/components/ui/Skeleton";
import { Heading, Text } from "@/components/ui/Text";
import { useAuth } from "@/context/AuthProvider";
import { getConversationPlan } from "@/lib/entitlements";
import { loadDashboard, type DashboardData } from "@/lib/queries/dashboard";
import { useTheme } from "@/theme/ThemeProvider";

export default function MyPageScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, initializing, signOut } = useAuth();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashboardError, setDashboardError] = useState(false);
  const [conversationPlan, setConversationPlan] = useState<Awaited<ReturnType<typeof getConversationPlan>>>(null);
  const [refreshing, setRefreshing] = useState(false);

  const reloadEntitlements = useCallback(() => {
    return getConversationPlan(user?.id).then(setConversationPlan).catch(() => {});
  }, [user]);

  const reloadDashboard = useCallback(() => {
    if (!user) return Promise.resolve();
    return loadDashboard()
      .then((data) => {
        setDashboard(data);
        setDashboardError(false);
      })
      .catch(() => setDashboardError(true));
  }, [user]);

  useEffect(() => {
    reloadEntitlements();
  }, [reloadEntitlements]);

  useEffect(() => {
    reloadDashboard();
  }, [reloadDashboard]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([reloadEntitlements(), reloadDashboard()]);
    } finally {
      setRefreshing(false);
    }
  }

  if (initializing) {
    return (
      <ScreenScroll contentContainerStyle={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll
      contentContainerStyle={{ gap: 28 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.signal} />
      }
    >
      <View>
        <Text eyebrow color="signal" weight="medium">
          My Page
        </Text>
        <Heading level={1} style={{ marginTop: 6 }}>
          {user ? "おかえりなさい" : "マイページ"}
        </Heading>
        <Text color="inkSoft" style={{ marginTop: 6, lineHeight: 20 }}>
          {user
            ? "ここまでの練習の記録です。少しずつでも、話すたびに力がついています。"
            : "ログインすると、練習の記録や進捗をここで確認できます。"}
        </Text>
      </View>

      {!user && (
        <Card style={{ alignItems: "center", gap: 10, paddingVertical: 28 }}>
          <Text weight="medium">ログインしてはじめる</Text>
          <Button label="ログイン" onPress={() => router.push("/login")} />
        </Card>
      )}

      {user && !dashboard && dashboardError && <ErrorState onRetry={reloadDashboard} />}
      {user && !dashboard && !dashboardError && <SkeletonList count={3} />}

      {user && dashboard && (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <StatTile label="継続日数" value={`${dashboard.streak}`} unit="日" accent="signal" />
            <StatTile label="今週の会話" value={`${dashboard.thisWeekCount}`} unit="回" accent="mint" />
            <StatTile
              label="平均フルエンシー"
              value={dashboard.avgFluency !== null ? `${dashboard.avgFluency}` : "-"}
              unit="/5"
              accent="violet"
            />
            <StatTile label="保存した単語" value={`${dashboard.savedWordCount}`} unit="語" accent="amber" />
          </View>

          {dashboard.trend.length >= 2 && (
            <Card style={{ gap: 4 }}>
              <Heading level={4}>フルエンシースコアの推移</Heading>
              <Text size={13} color="inkSoft">
                直近{dashboard.trend.length}回の会話フィードバックより
              </Text>
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 12, height: 100 }}>
                {dashboard.trend.map((s) => (
                  <View key={s.id} style={{ flex: 1, alignItems: "center", gap: 6 }}>
                    <Text size={12} weight="semibold">
                      {s.fluencyScore}
                    </Text>
                    <View
                      style={{
                        width: "100%",
                        height: 60,
                        backgroundColor: theme.colors.paperDim,
                        borderRadius: 4,
                        justifyContent: "flex-end",
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          width: "100%",
                          height: `${(s.fluencyScore / 5) * 100}%`,
                          backgroundColor: theme.colors.signal,
                        }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {dashboard.recommended && (
            <GradientHero style={{ borderRadius: theme.radius.md }}>
              <Text size={11} color="inkFaint" eyebrow>
                次におすすめ
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Avatar name={dashboard.recommended.persona_name} />
                <View style={{ flex: 1 }}>
                  <Text weight="semibold" style={{ color: theme.colors.paper }}>
                    {dashboard.recommended.title}
                  </Text>
                  <Text size={12} style={{ color: theme.colors.inkFaint }}>
                    {dashboard.recommended.persona_name}({dashboard.recommended.persona_role})
                  </Text>
                </View>
              </View>
              <Text size={13} style={{ color: theme.colors.inkFaint, lineHeight: 18 }}>
                {dashboard.recommended.description}
              </Text>
              <Button
                label="このシーンを話す →"
                onPress={() => router.push(`/(tabs)/conversation/${dashboard.recommended!.slug}`)}
              />
            </GradientHero>
          )}

          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Heading level={4}>最近の会話</Heading>
              <Text
                size={13}
                color="signal"
                weight="medium"
                onPress={() => router.push("/(tabs)/conversation/history")}
              >
                すべて見る →
              </Text>
            </View>
            {dashboard.recent.length === 0 ? (
              <Text size={13} color="inkSoft">
                まだ会話の記録がありません。無料のシーンから話してみましょう。
              </Text>
            ) : (
              dashboard.recent.map((s) => (
                <PressableCard
                  key={s.id}
                  onPress={() => router.push(`/(tabs)/conversation/history/${s.id}`)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderWidth: 0,
                    padding: 8,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Avatar name={s.personaName} size="sm" />
                    <View>
                      <Text size={13} weight="medium">
                        {s.scenarioTitle}
                      </Text>
                      <Text size={11} color="inkFaint">
                        {s.endedAt ? new Date(s.endedAt).toLocaleDateString("ja-JP") : ""}
                      </Text>
                    </View>
                  </View>
                  {s.fluencyScore !== null && (
                    <Text weight="semibold" color="signal" size={13}>
                      {s.fluencyScore}/5
                    </Text>
                  )}
                </PressableCard>
              ))
            )}
          </Card>
        </>
      )}

      <View style={{ gap: 6 }}>
        <Text eyebrow color="signal" weight="medium">
          Pricing
        </Text>
        <Heading level={3} style={{ marginBottom: 8 }}>
          料金プラン
        </Heading>
        <PricingPlans
          isLoggedIn={!!user}
          conversationPlan={conversationPlan}
          onCheckoutReturn={reloadEntitlements}
        />
      </View>

      <View style={{ gap: 12 }}>
        <Text eyebrow color="signal" weight="medium">
          Settings
        </Text>
        <SettingsLinks />
      </View>

      {user && (
        <>
          <Button label="ログアウト" variant="ghost" onPress={signOut} />
          <DangerZone />
        </>
      )}
    </ScreenScroll>
  );
}
