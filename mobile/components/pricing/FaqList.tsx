import { ChevronDown } from "lucide-react-native";
import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { Heading, Text } from "@/components/ui/Text";
import { useTheme } from "@/theme/ThemeProvider";

// Mirrors ../../src/app/pricing/page.tsx's FAQ array — same 6 questions,
// same answers. This covers cancellation policy and pricing framing
// (景品表示法-relevant "先行提供価格" explanation) that previously existed
// only on the web pricing page.
const FAQ: { question: string; answer: string }[] = [
  {
    question: "いつでも解約できますか?",
    answer:
      "はい、いつでも解約可能です。登録済みの方は各プランの「お支払い方法の変更・解約はこちら」からご自身で解約できます。解約後は次回以降の請求は発生しません。",
  },
  {
    question: "支払い方法は何がありますか?",
    answer:
      "Androidはクレジットカード(Visa, Mastercard, American Expressなど)によるお支払いに対応しています(Stripe社のシステムを通じて処理)。iOSはApp内課金(お使いのApple IDに設定済みの支払い方法)でのお支払いとなります。",
  },
  {
    question: "無料でどこまで試せますか?",
    answer:
      "リスニング教材と単語帳は、登録なしで全て無料でご利用いただけます。AI会話は、登録すると初回10分間、どのシーンでも無料でお試しいただけます(使い切りの一度きりの特典です)。それ以上お話しになりたい場合は、AI会話プランへのご登録が必要です。",
  },
  {
    question: "AI英会話の時間に上限があるのはなぜですか?",
    answer:
      "AI英会話はリアルタイムの音声AIを利用しており、話した時間に応じて実際のAPI利用コストが発生します。安定してサービスを提供し続けるため、プランごとに月あたりの利用可能時間(分)を設けています。使い放題プランも、ごく一部の極端な利用を除き実質的に使い放題となる、十分に余裕を持った時間を設定しています。",
  },
  {
    question: "リスニング教材はどのプランでも使えますか?",
    answer:
      "リスニングプランのほか、お試し・スタンダード・使い放題プランのいずれかにご登録いただいても、リスニング教材は聞き放題でご利用いただけます。",
  },
  {
    question: "「先行提供価格」とはなんですか?",
    answer:
      "現在ご案内している価格は、サービス立ち上げ期にご利用いただくための先行提供価格です。各プランには将来移行を予定している正式価格を明記しており、価格変更の際は事前にお知らせします(すでにご登録中の方が、通知なく値上げされることはありません)。",
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.line, paddingVertical: 14 }}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}
      >
        <Text weight="medium" style={{ flex: 1 }}>
          {question}
        </Text>
        <ChevronDown
          size={18}
          color={theme.colors.signal}
          strokeWidth={2}
          style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
        />
      </Pressable>
      {open && (
        <Text size={13} color="inkSoft" style={{ marginTop: 10, lineHeight: 19 }}>
          {answer}
        </Text>
      )}
    </View>
  );
}

export function FaqList() {
  return (
    <View style={{ gap: 4 }}>
      <Heading level={4}>よくある質問</Heading>
      <View>
        {FAQ.map((item) => (
          <FaqItem key={item.question} question={item.question} answer={item.answer} />
        ))}
      </View>
    </View>
  );
}
