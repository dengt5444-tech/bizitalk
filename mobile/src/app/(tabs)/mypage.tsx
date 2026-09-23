import * as Linking from "expo-linking";
import { router, useFocusEffect } from "expo-router";
import {
  ArrowRight,
  BookMarked,
  ChevronRight,
  CreditCard,
  FileText,
  History,
  LogOut,
  Mail,
  Scale,
  Shield,
} from "lucide-react-native";
import { useCallback, useState, type ReactNode } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { Badge, Button, Card, ErrorState, Loading, Screen, SectionHeader, Text } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { ConversationFeedback } from "@/lib/conversation";
import { formatDate, one } from "@/lib/format";
import { PLAN_LABELS, usePlan } from "@/lib/plan";
import { fetchDashboard, type DashboardData } from "@/lib/queries";
import { SUPPORT_EMAIL } from "@/lib/site";
import { useAsync } from "@/lib/useAsync";
import { fonts, useColors, type ThemeColors } from "@/theme";

function dateKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function computeStreak(dateKeys: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  if (!dateKeys.has(dateKey(cursor.toISOString()))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (dateKeys.has(dateKey(cursor.toISOString()))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

// Same statistics as the web dashboard (/dashboard), computed from the
// same query.
function summarize(data: DashboardData) {
  const completed = data.sessions.filter((s) => s.status === "completed");
  const streak = computeStreak(new Set(completed.filter((s) => s.ended_at).map((s) => dateKey(s.ended_at!))));
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeekCount = completed.filter((s) => s.ended_at && new Date(s.ended_at).getTime() >= weekAgo).length;
  const scored = completed
    .filter((s) => s.feedback)
    .map((s) => ({ id: s.id, endedAt: s.ended_at as string, feedback: s.feedback as ConversationFeedback }))
    .reverse();
  const avgFluency =
    scored.length > 0
      ? Math.round((scored.reduce((sum, s) => sum + s.feedback.fluencyScore, 0) / scored.length) * 10) / 10
      : null;
  const practicedTitles = new Set(
    data.sessions.map((s) => one(s.conversation_scenarios)?.title).filter((t): t is string => !!t),
  );
  const recommended = data.scenarios.find((sc) => !practicedTitles.has(sc.title)) ?? data.scenarios[0];
  return { streak, thisWeekCount, avgFluency, trend: scored.slice(-8), recent: completed.slice(0, 5), recommended };
}

export default function MyPageScreen() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <SignedOut />;
  return <Dashboard email={user.email ?? ""} />;
}

function SignedOut() {
  return (
    <Screen topInset>
      <SectionHeader eyebrow="My page" title="マイページ" />
      <Card style={{ gap: 12 }}>
        <Text variant="heading">ログインして練習を記録しましょう</Text>
        <Text variant="small">
          Webサイトと同じメールアドレスでログインすると、会話の記録・復習リスト・ご登録中のプランをそのまま引き継げます。
        </Text>
        <Button title="ログイン" onPress={() => router.push("/login")} />
      </Card>
      <AccountLinks signedIn={false} />
    </Screen>
  );
}

function Dashboard({ email }: { email: string }) {
  const colors = useColors();
  const { plan, refresh: refreshPlan } = usePlan();
  const { data, error, loading, refreshing, refresh, reload } = useAsync(fetchDashboard, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshPlan();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh on focus only
    }, []),
  );

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorState onRetry={reload} />;
  if (!data) return null;

  const { streak, thisWeekCount, avgFluency, trend, recent, recommended } = summarize(data);

  return (
    <Screen topInset refreshing={refreshing} onRefresh={refresh}>
      <SectionHeader
        eyebrow="Dashboard"
        title="おかえりなさい"
        description="ここまでの練習の記録です。少しずつでも、話すたびに力がついています。"
      />
      <View style={styles.planRow}>
        <Text variant="caption" numberOfLines={1} style={{ flexShrink: 1 }}>
          {email}
        </Text>
        <Badge tone={plan ? "signal" : "neutral"} label={plan ? PLAN_LABELS[plan] : "無料(月5分まで)"} />
      </View>

      <View style={styles.statGrid}>
        <StatTile label="継続日数" value={`${streak}`} unit="日" color={colors.signal} />
        <StatTile label="今週の会話" value={`${thisWeekCount}`} unit="回" color={colors.mintDim} />
        <StatTile label="平均フルエンシー" value={avgFluency !== null ? `${avgFluency}` : "-"} unit="/5" color={colors.violetDim} />
        <StatTile label="保存した単語" value={`${data.vocabCount}`} unit="語" color={colors.amberDim} />
      </View>

      {trend.length >= 2 && (
        <Card style={{ gap: 4 }}>
          <Text variant="heading">フルエンシースコアの推移</Text>
          <Text variant="small">直近{trend.length}回の会話フィードバックより</Text>
          <View style={styles.chart}>
            {trend.map((s) => (
              <View key={s.id} style={styles.bar}>
                <Text variant="caption" tone="ink" weight="600">
                  {s.feedback.fluencyScore}
                </Text>
                <View style={[styles.barTrack, { backgroundColor: colors.paperDim }]}>
                  <View
                    style={[styles.barFill, { height: `${(s.feedback.fluencyScore / 5) * 100}%`, backgroundColor: colors.signal }]}
                  />
                </View>
                <Text variant="caption" style={{ fontSize: 9.5 }}>
                  {new Date(s.endedAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {recommended && (
        <Card tone="ink" style={{ gap: 10 }}>
          <Text variant="eyebrow" style={{ color: colors.paper, opacity: 0.7 }}>
            次におすすめ
          </Text>
          <View style={styles.row}>
            <Avatar name={recommended.persona_name} />
            <View style={{ flex: 1 }}>
              <Text variant="heading" style={{ color: colors.paper }}>
                {recommended.title}
              </Text>
              <Text variant="caption" style={{ color: colors.paper, opacity: 0.7 }}>
                {recommended.persona_name}（{recommended.persona_role}）
              </Text>
            </View>
          </View>
          <Text variant="small" style={{ color: colors.paper, opacity: 0.8 }}>
            {recommended.description}
          </Text>
          <Button
            title="このシーンを話す"
            icon={<ArrowRight size={16} color={colors.onSignal} />}
            onPress={() => router.push(`/conversation/${recommended.slug}`)}
            style={{ alignSelf: "flex-start", marginTop: 4 }}
          />
        </Card>
      )}

      <Card style={{ gap: 6 }}>
        <View style={[styles.row, { justifyContent: "space-between" }]}>
          <Text variant="heading">最近の会話</Text>
          <Pressable onPress={() => router.push("/history")} style={styles.row} hitSlop={8}>
            <Text variant="small" tone="signal" weight="600">
              すべて見る
            </Text>
            <ArrowRight size={14} color={colors.signal} />
          </Pressable>
        </View>
        {recent.length === 0 ? (
          <Text variant="small" style={{ marginTop: 6 }}>
            まだ会話の記録がありません。気になるシーンから話してみましょう。
          </Text>
        ) : (
          recent.map((s) => {
            const scenario = one(s.conversation_scenarios);
            return (
              <Pressable
                key={s.id}
                onPress={() => router.push(`/history/${s.id}`)}
                style={({ pressed }) => [styles.recent, pressed && { backgroundColor: colors.paperDim }]}
              >
                <Avatar name={scenario?.persona_name ?? "?"} size="sm" />
                <View style={{ flex: 1 }}>
                  <Text variant="small" tone="ink" weight="600">
                    {scenario?.title ?? "削除されたシーン"}
                  </Text>
                  <Text variant="caption">{formatDate(s.ended_at)}</Text>
                </View>
                {s.feedback && (
                  <Text style={{ fontFamily: fonts.display, fontWeight: "600", color: colors.signal }}>
                    {s.feedback.fluencyScore}/5
                  </Text>
                )}
              </Pressable>
            );
          })
        )}
      </Card>

      <AccountLinks signedIn />
      <DangerZone />
    </Screen>
  );
}

function StatTile({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <Card style={styles.stat}>
      <Text variant="caption">{label}</Text>
      <Text style={{ fontFamily: fonts.display, fontSize: 28, fontWeight: "600", color }}>
        {value}
        <Text variant="small" tone="inkFaint">
          {" "}
          {unit}
        </Text>
      </Text>
    </Card>
  );
}

function MenuRow({ icon, label, onPress, colors }: { icon: ReactNode; label: string; onPress: () => void; colors: ThemeColors }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.menuRow, pressed && { backgroundColor: colors.paperDim }]}
    >
      {icon}
      <Text variant="body" tone="ink" style={{ flex: 1 }}>
        {label}
      </Text>
      <ChevronRight size={18} color={colors.inkFaint} />
    </Pressable>
  );
}

function AccountLinks({ signedIn }: { signedIn: boolean }) {
  const colors = useColors();
  const { signOut } = useAuth();
  const iconColor = colors.inkSoft;

  function confirmSignOut() {
    Alert.alert("ログアウトしますか?", undefined, [
      { text: "キャンセル", style: "cancel" },
      { text: "ログアウト", style: "destructive", onPress: () => signOut() },
    ]);
  }

  return (
    <Card padded={false} style={{ paddingVertical: 6 }}>
      {signedIn && (
        <>
          <MenuRow colors={colors} icon={<BookMarked size={19} color={iconColor} />} label="復習リスト" onPress={() => router.push("/review")} />
          <MenuRow colors={colors} icon={<History size={19} color={iconColor} />} label="会話の記録" onPress={() => router.push("/history")} />
        </>
      )}
      <MenuRow colors={colors} icon={<CreditCard size={19} color={iconColor} />} label="料金プラン" onPress={() => router.push("/pricing")} />
      <MenuRow colors={colors} icon={<FileText size={19} color={iconColor} />} label="利用規約" onPress={() => router.push("/terms")} />
      <MenuRow colors={colors} icon={<Shield size={19} color={iconColor} />} label="プライバシーポリシー" onPress={() => router.push("/privacy")} />
      <MenuRow colors={colors} icon={<Scale size={19} color={iconColor} />} label="特定商取引法に基づく表記" onPress={() => router.push("/legal")} />
      <MenuRow
        colors={colors}
        icon={<Mail size={19} color={iconColor} />}
        label="お問い合わせ"
        onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => Alert.alert("お問い合わせ", SUPPORT_EMAIL))}
      />
      {signedIn && <MenuRow colors={colors} icon={<LogOut size={19} color={iconColor} />} label="ログアウト" onPress={confirmSignOut} />}
    </Card>
  );
}

// Required by App Store Review Guideline 5.1.1(v): an app that lets people
// create an account must let them delete it from within the app. Uses the
// same backend endpoint as the website's DangerZone.
function DangerZone() {
  const colors = useColors();
  const { signOut } = useAuth();
  const { source } = usePlan();
  const [deleting, setDeleting] = useState(false);

  async function performDelete() {
    setDeleting(true);
    try {
      await api.post("/api/account/delete");
      await signOut();
      router.navigate("/");
    } catch {
      Alert.alert("削除に失敗しました", "しばらくしてからもう一度お試しいただくか、サポートまでご連絡ください。");
    } finally {
      setDeleting(false);
    }
  }

  function confirmDelete() {
    const appleNote =
      source === "apple_iap"
        ? "\n\nApp Storeでご購入のサブスクリプションは、アカウントを削除しても自動では解約されません。先にiPhoneの「設定」>「Apple ID」>「サブスクリプション」から解約してください。"
        : "";
    Alert.alert(
      "アカウントを削除しますか?",
      `会話の記録・復習リスト・ご登録中のプランなど、すべてのデータが完全に削除されます。この操作は取り消せません。Webサイトでご登録の有料プランは自動的に解約されます。${appleNote}`,
      [
        { text: "キャンセル", style: "cancel" },
        { text: "削除する", style: "destructive", onPress: performDelete },
      ],
    );
  }

  return (
    <View style={[styles.danger, { borderColor: colors.rose }]}>
      <Text variant="body" tone="rose" weight="600">
        アカウントの削除
      </Text>
      <Text variant="caption" tone="inkSoft">
        アカウントとすべてのデータを完全に削除します。ご登録中の有料プランも解約されます(App Storeでのご購入分はAppleの設定から解約してください)。この操作は取り消せません。
      </Text>
      <Button title="アカウントを削除する" variant="danger" size="sm" loading={deleting} onPress={confirmDelete} style={{ alignSelf: "flex-start", marginTop: 6 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  planRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: { width: "47%", flexGrow: 1, gap: 4, padding: 16 },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 14 },
  bar: { flex: 1, alignItems: "center", gap: 6 },
  barTrack: { height: 90, width: "100%", borderRadius: 4, justifyContent: "flex-end", overflow: "hidden" },
  barFill: { width: "100%", borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  recent: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 12 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingVertical: 14 },
  danger: { borderWidth: 1, borderRadius: 18, padding: 18, gap: 6 },
});
