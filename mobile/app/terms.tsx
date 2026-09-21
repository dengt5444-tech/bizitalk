import React from "react";
import { View } from "react-native";
import { LegalSection } from "@/components/legal/LegalSection";
import { ScreenScroll } from "@/components/ui/ScreenContainer";
import { Heading, Text } from "@/components/ui/Text";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

export default function TermsScreen() {
  return (
    <ScreenScroll contentContainerStyle={{ gap: 24 }}>
      <View>
        <Heading level={1}>利用規約</Heading>
        <Text size={12} color="inkFaint" style={{ marginTop: 6 }}>
          最終更新日: {new Date().toISOString().slice(0, 10)}
        </Text>
      </View>

      <LegalSection title="第1条(適用)">
        本規約は、{SITE_NAME}(以下「本サービス」といいます)の利用条件を定めるものです。利用者は、本サービスを利用することにより、本規約の内容に同意したものとみなします。
      </LegalSection>

      <LegalSection title="第2条(サービス内容)">
        本サービスは、AIとのリアルタイム音声・テキストによるビジネス英会話練習、会話後のAIコーチによるフィードバック、単語の復習機能を提供するものです。一部シーンは無料で利用でき、その他のシーンの利用には有料プランへの登録が必要です。
      </LegalSection>

      <LegalSection title="第3条(アカウント)">
        利用者は、登録したメールアドレスの管理について責任を負うものとします。第三者による不正利用について、当方は故意または重過失がある場合を除き責任を負いません。
      </LegalSection>

      <LegalSection title="第4条(有料プランと支払い)">
        有料プランは月額課金制であり、登録した支払い方法により毎月自動的に更新・請求されます。解約は次回更新日の前までにいつでも行うことができ、解約後は次回請求が発生しません。日割りでの返金は行いません。
      </LegalSection>

      <LegalSection title="第5条(禁止事項)">
        利用者は、本サービスを通じて生成された会話内容・音声・フィードバックを権限なく複製、再配布、または営利目的で第三者に提供してはなりません。また、本サービスの運営を妨害する行為、不正アクセスを試みる行為、AIとの会話を通じて違法・有害なコンテンツの生成を試みる行為を行ってはなりません。
      </LegalSection>

      <LegalSection title="第6条(免責事項)">
        本サービスが提供するAIの発話内容・フィードバックの正確性・完全性について保証するものではありません。本サービスの利用により生じた損害について、当方に故意または重過失がある場合を除き、責任を負わないものとします。
      </LegalSection>

      <LegalSection title="第7条(規約の変更)">
        当方は、必要と判断した場合、利用者への事前の通知なく本規約を変更できるものとします。変更後の規約は、本ページに掲載した時点から効力を生じるものとします。
      </LegalSection>

      <LegalSection title="第8条(お問い合わせ)">
        本規約に関するお問い合わせは、{SUPPORT_EMAIL} までご連絡ください。
      </LegalSection>
    </ScreenScroll>
  );
}
