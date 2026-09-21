import React from "react";
import { View } from "react-native";
import { ScreenScroll } from "@/components/ui/ScreenContainer";
import { Heading, Text } from "@/components/ui/Text";
import { SUPPORT_EMAIL } from "@/lib/site";
import { useTheme } from "@/theme/ThemeProvider";

const ROWS: [string, string][] = [
  ["販売事業者名", "渡邊 岳登"],
  ["運営責任者", "渡邊 岳登"],
  ["所在地", "ご請求いただき次第、遅滞なく開示いたします。"],
  ["電話番号", "ご請求いただき次第、遅滞なく開示いたします。"],
  ["メールアドレス", SUPPORT_EMAIL],
  [
    "販売価格",
    "各プランの月額料金は、アプリ内の「マイページ」の料金プランに表示の金額(税込)によります。現在は先行提供価格でのご案内です。各プランの正式価格(先行提供価格終了後の価格)も料金プランの画面に明記しています。",
  ],
  ["商品代金以外の必要料金", "インターネット接続料金・通信料金はお客様のご負担となります"],
  ["お支払い方法", "クレジットカード決済(Stripe社の決済システムを利用)"],
  ["お支払い時期", "ご登録時に初回のお支払いが発生し、以降は毎月同日に自動更新・自動課金されます"],
  ["サービスの提供時期", "決済完了後、直ちにご利用いただけます"],
  [
    "返品・キャンセルについて",
    "デジタルサービスの性質上、提供済みのサービスに対する返金は原則として行いません。解約はマイページからいつでも行うことができ、解約後は次回以降の請求は発生しません(日割り返金はありません)。",
  ],
];

export default function LegalDisclosureScreen() {
  const theme = useTheme();

  return (
    <ScreenScroll contentContainerStyle={{ gap: 16 }}>
      <View>
        <Heading level={1}>特定商取引法に基づく表記</Heading>
        <Text size={13} color="inkSoft" style={{ marginTop: 8, lineHeight: 19 }}>
          「特定商取引に関する法律」第11条に基づき、以下のとおり表示します。
        </Text>
      </View>

      <View style={{ borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.line, overflow: "hidden" }}>
        {ROWS.map(([label, value], index) => (
          <View
            key={label}
            style={{
              flexDirection: "row",
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: theme.colors.line,
            }}
          >
            <View style={{ width: 120, backgroundColor: theme.colors.paperDim, padding: 12 }}>
              <Text size={12} weight="semibold">
                {label}
              </Text>
            </View>
            <View style={{ flex: 1, padding: 12 }}>
              <Text size={12} color="inkSoft" style={{ lineHeight: 18 }}>
                {value}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScreenScroll>
  );
}
