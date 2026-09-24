import { router } from "expo-router";
import { ArrowRight, Sparkles } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { CategoryIcon } from "@/components/CategoryIcon";
import { Badge, Button, Card, Screen, Text } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { CATEGORY_DESCRIPTIONS, CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/scenarios";
import { fonts, useColors } from "@/theme";

const WHY_ENGLISH = [
  {
    title: "キャリアの選択肢が増える",
    description:
      "海外プロジェクトへの参加、グローバルチームでの評価、転職市場での見え方——英語で自分の意見を言えることは、任される仕事の範囲を直接広げます。",
    dot: "signalDim",
  },
  {
    title: "任される仕事の幅が広がる",
    description:
      "会議で臆せず発言できる、メールだけでなく口頭でも交渉できる。それだけで「この人になら任せられる」と思われる機会が増えます。",
    dot: "mint",
  },
  {
    title: "今日の一言が、明日の自信になる",
    description: "言えなかった一言が言えるようになる。その積み重ねが、次のチャンスに手を挙げる自信につながります。",
    dot: "violet",
  },
] as const;

const PERSONAS = [
  { name: "Michael Chen", role: "CEO(アメリカ)" },
  { name: "Priya Sharma", role: "開発チームリード(インド)" },
  { name: "Oliver Bennett", role: "マネージャー(イギリス)" },
  { name: "Morgan Lee", role: "新規クライアント" },
];

const FEATURES = [
  {
    number: "01",
    title: "相手が変われば、英語も変わる",
    description:
      "CEOへの報告、インドの同僚とのスタンドアップ、取引先との交渉——誰と話すかでキャラクター設定されたAIが変わり、その場に合った英語を練習できます。",
    tone: "signal",
  },
  {
    number: "02",
    title: "リアルタイム音声で、本物の会話のように",
    description:
      "AIとマイクごしに低遅延で会話。間が空いたり、言葉に詰まったり——本物の会話に近い緊張感の中で練習できます。",
    tone: "mint",
  },
  {
    number: "03",
    title: "会話後にAIコーチがフィードバック",
    description:
      "話し終えると、言い間違いの修正・良かった表現・使うと良い単語を分析。文法・語彙・丁寧さをスコアで可視化し、話すたびに弱点がはっきりします。",
    tone: "violet",
  },
  {
    number: "04",
    title: "記録が残るから、成長が見える",
    description:
      "マイページでフルエンシースコアの推移や継続日数を確認。過去の会話とフィードバックはいつでも見返せて、苦手な表現は復習リストに残ります。",
    tone: "amber",
  },
] as const;

export default function HomeScreen() {
  const colors = useColors();
  const { user } = useAuth();

  const featureTint = {
    signal: [colors.signalTint, colors.signal],
    mint: [colors.mintTint, colors.mintDim],
    violet: [colors.violetTint, colors.violetDim],
    amber: [colors.amberTint, colors.amberDim],
  } as const;

  return (
    <Screen topInset contentStyle={{ gap: 28 }}>
      <View style={styles.brandRow}>
        <View style={[styles.logo, { backgroundColor: colors.signal }]}>
          <Text style={{ color: colors.onSignal, fontFamily: fonts.display, fontWeight: "700" }}>ビ</Text>
        </View>
        <Text variant="heading" style={{ fontSize: 18, letterSpacing: 1 }}>
          ビジトーク
        </Text>
      </View>

      <View style={{ gap: 16 }}>
        <Badge
          tone="signal"
          label="登録すれば全シーン月5分まで無料でお試しいただけます"
          icon={<Sparkles size={12} color={colors.amber} />}
        />
        <Text style={[styles.hero, { color: colors.ink }]}>誰と話すかで、{"\n"}英語は変わる。</Text>
        <Text>
          ビジトークは、CEOや海外の同僚、取引先など、実在しそうな相手役とシチュエーション別にリアルタイム音声で練習するAIビジネス英会話サービスです。会話のたびにAIコーチが弱点をフィードバックするから、話すほど着実に力がつきます。
        </Text>
        <View style={{ gap: 10 }}>
          <Button title="AIと話してみる(無料)" size="lg" onPress={() => router.navigate("/conversation")} />
          <Button title="料金プランを見る" variant="secondary" size="lg" onPress={() => router.push("/pricing")} />
          {!user && <Button title="ログイン" variant="ghost" onPress={() => router.push("/login")} />}
        </View>
      </View>

      <Card tone="ink" style={{ gap: 14 }}>
        <Text variant="eyebrow" style={{ color: colors.paper, opacity: 0.6 }}>
          Why English, why now
        </Text>
        <Text variant="title" style={{ color: colors.paper, fontSize: 21 }}>
          英語は、キャリアと年収を動かす実務スキルです。
        </Text>
        {WHY_ENGLISH.map((item) => (
          <View key={item.title} style={[styles.whyItem, { backgroundColor: "rgba(245,247,250,0.08)" }]}>
            <View style={[styles.dot, { backgroundColor: colors[item.dot] }]} />
            <Text variant="heading" style={{ color: colors.paper, fontSize: 15 }}>
              {item.title}
            </Text>
            <Text variant="small" style={{ color: colors.paper, opacity: 0.72 }}>
              {item.description}
            </Text>
          </View>
        ))}
      </Card>

      <View style={{ gap: 12 }}>
        <Text variant="eyebrow" center>
          Scenarios
        </Text>
        <Text variant="title" center>
          6つのカテゴリーで、{"\n"}実践に近い英語を。
        </Text>
        {CATEGORY_ORDER.map((category) => (
          <Card key={category} onPress={() => router.navigate("/conversation")} style={styles.categoryCard}>
            <CategoryIcon category={category} size={52} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="heading">{CATEGORY_LABELS[category]}</Text>
              <Text variant="small">{CATEGORY_DESCRIPTIONS[category]}</Text>
            </View>
          </Card>
        ))}
      </View>

      <View style={{ gap: 12 }}>
        <Text variant="eyebrow" tone="inkFaint" center>
          Who you&apos;ll talk to
        </Text>
        <View style={styles.personaGrid}>
          {PERSONAS.map((persona) => (
            <Card key={persona.name} style={styles.persona}>
              <Avatar name={persona.name} />
              <Text variant="small" tone="ink" weight="600" center>
                {persona.name}
              </Text>
              <Text variant="caption" center>
                {persona.role}
              </Text>
            </Card>
          ))}
        </View>
        <Text variant="small" center>
          ほかにも、シンガポールやドイツの同僚、投資家、外資系企業の採用面接官など全31シーンをご用意しています。
        </Text>
      </View>

      <Card tone="amberTint" style={{ gap: 8 }}>
        <Text variant="eyebrow" tone="amberDim">
          Listening
        </Text>
        <Text variant="heading" style={{ fontSize: 19 }}>
          話す前に、まず聞く力も鍛えたい方へ
        </Text>
        <Text variant="small">スクリプト・単語・理解度テスト付きのビジネスリスニング教材を、すべて無料でご用意しています。</Text>
        <Button
          title="リスニング教材を見る"
          variant="secondary"
          icon={<ArrowRight size={16} color={colors.ink} />}
          onPress={() => router.navigate("/materials")}
          style={{ alignSelf: "flex-start", marginTop: 6 }}
        />
      </Card>

      <View style={{ gap: 4 }}>
        <Text variant="eyebrow">Features</Text>
        <Text variant="title">話して、直されて、身につく。</Text>
        {FEATURES.map((feature) => {
          const [bg, fg] = featureTint[feature.tone];
          return (
            <View key={feature.number} style={[styles.feature, { borderTopColor: colors.line }]}>
              <View style={[styles.featureNumber, { backgroundColor: bg }]}>
                <Text style={{ color: fg, fontFamily: fonts.display, fontWeight: "700" }}>{feature.number}</Text>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text variant="heading">{feature.title}</Text>
                <Text variant="small">{feature.description}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <Card tone="ink" style={{ alignItems: "center", gap: 18, paddingVertical: 32 }}>
        <Text variant="title" center style={{ color: colors.paper }}>
          次に話す相手を、{"\n"}今日決めてみませんか。
        </Text>
        <Button title="シーンを選んで始める" onPress={() => router.navigate("/conversation")} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  hero: { fontFamily: fonts.display, fontSize: 38, lineHeight: 50, fontWeight: "600" },
  whyItem: { borderRadius: 20, padding: 16, gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  categoryCard: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  personaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  persona: { width: "47%", flexGrow: 1, alignItems: "center", gap: 6, padding: 16 },
  feature: { flexDirection: "row", gap: 14, paddingVertical: 18, borderTopWidth: StyleSheet.hairlineWidth },
  featureNumber: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
