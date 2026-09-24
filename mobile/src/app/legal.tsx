import { StyleSheet, View } from "react-native";
import { Screen, Text } from "@/components/ui";
import { SUPPORT_EMAIL } from "@/lib/site";
import { useColors } from "@/theme";

// Same disclosure as the website's /legal (特定商取引法に基づく表記).
const ROWS: [string, string][] = [
  ["販売事業者名", "渡邊 岳登"],
  ["運営責任者", "渡邊 岳登"],
  ["所在地", "ご請求いただき次第、遅滞なく開示いたします。"],
  ["電話番号", "ご請求いただき次第、遅滞なく開示いたします。"],
  ["メールアドレス", SUPPORT_EMAIL],
  [
    "販売価格",
    "各プランの月額料金は、料金ページに表示の金額(税込)によります。現在は先行提供価格でのご案内です。各プランの正式価格(先行提供価格終了後の価格)も料金ページに明記しています。",
  ],
  ["商品代金以外の必要料金", "インターネット接続料金・通信料金はお客様のご負担となります"],
  [
    "お支払い方法",
    "Webサイト: クレジットカード決済(Stripe社の決済システムを利用)/ iPhoneアプリ: App Storeのアプリ内課金(Apple IDに登録のお支払い方法)",
  ],
  ["お支払い時期", "ご登録時に初回のお支払いが発生し、以降は毎月同日に自動更新・自動課金されます"],
  ["サービスの提供時期", "決済完了後、直ちにご利用いただけます"],
  [
    "返品・キャンセルについて",
    "デジタルサービスの性質上、提供済みのサービスに対する返金は原則として行いません。解約はいつでも行うことができ、解約後は次回以降の請求は発生しません(日割り返金はありません)。App Storeでのご購入分の返金はAppleの定める方針に従います。",
  ],
];

export default function LegalScreen() {
  const colors = useColors();
  return (
    <Screen>
      <Text variant="small">「特定商取引に関する法律」第11条に基づき、以下のとおり表示します。</Text>
      <View style={[styles.table, { borderColor: colors.line }]}>
        {ROWS.map(([label, value], i) => (
          <View key={label} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
            <View style={[styles.label, { backgroundColor: colors.paperDim }]}>
              <Text variant="small" tone="ink" weight="600">
                {label}
              </Text>
            </View>
            <View style={styles.value}>
              <Text variant="small" selectable>
                {value}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  table: { borderWidth: 1, borderRadius: 16, overflow: "hidden" },
  row: {},
  label: { paddingHorizontal: 14, paddingVertical: 10 },
  value: { paddingHorizontal: 14, paddingVertical: 12 },
});
