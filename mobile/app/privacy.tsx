import React from "react";
import { View } from "react-native";
import { LegalSection } from "@/components/legal/LegalSection";
import { ScreenScroll } from "@/components/ui/ScreenContainer";
import { Heading, Text } from "@/components/ui/Text";
import { SUPPORT_EMAIL } from "@/lib/site";

export default function PrivacyScreen() {
  return (
    <ScreenScroll contentContainerStyle={{ gap: 24 }}>
      <View>
        <Heading level={1}>プライバシーポリシー</Heading>
        <Text size={12} color="inkFaint" style={{ marginTop: 6 }}>
          最終更新日: {new Date().toISOString().slice(0, 10)}
        </Text>
      </View>

      <LegalSection title="1. 取得する情報">
        本サービスは、ログインのためのメールアドレス、AI会話練習の記録(会話内容・AIコーチのフィードバック・復習リストに保存した単語など)、および有料プランご利用の場合は決済サービス(Stripe)を通じて処理される決済情報を取得します。クレジットカード番号そのものは当方のサーバーには保存されません。
      </LegalSection>

      <LegalSection title="2. マイクの音声データについて">
        リアルタイム音声モードでは、ご利用中のアプリ(またはブラウザ)からOpenAI社のRealtime
        APIへ、マイクの音声データが直接送信されます(当方のサーバーを経由しません)。会話終了後、当方のサーバーには音声そのものではなく、文字起こしされた会話内容とAIコーチのフィードバックのみが保存されます。マイクへのアクセスは、実際にリアルタイム音声モードで会話を始めたときにのみ求められます。
      </LegalSection>

      <LegalSection title="3. 利用目的">
        取得した情報は、本サービスの提供、ログイン認証、有料プランの管理、サービス改善のための分析、お問い合わせへの対応のために利用します。
      </LegalSection>

      <LegalSection title="4. 第三者への提供・委託">
        <View style={{ gap: 8 }}>
          <Text color="inkSoft" style={{ lineHeight: 20 }}>
            本サービスは、以下の外部サービスを利用しており、必要な範囲でこれらの事業者に情報を取り扱わせています。
          </Text>
          <View style={{ gap: 4, paddingLeft: 4 }}>
            {[
              "Supabase(認証・データベースの保管)",
              "OpenAI(AI会話・リアルタイム音声・フィードバック生成)",
              "Stripe(決済処理)",
              "Vercel(サービスのホスティング)",
              "Apple App Store / Google Play(アプリの配信)",
            ].map((item) => (
              <Text key={item} color="inkSoft" size={13} style={{ lineHeight: 19 }}>
                ・{item}
              </Text>
            ))}
          </View>
          <Text color="inkSoft" style={{ lineHeight: 20 }}>
            法令に基づく場合を除き、これら以外の第三者に個人情報を提供することはありません。
          </Text>
        </View>
      </LegalSection>

      <LegalSection title="5. Cookie・端末内保存データの利用">
        本サービスは、ログイン状態を維持するためにCookie(Web版)またはアプリ内の安全な端末内ストレージ(アプリ版)を利用します。これらを無効化・削除した場合、一部機能が正常に動作しない場合があります。
      </LegalSection>

      <LegalSection title="6. 情報の開示・削除請求">
        利用者は、自身の個人情報の開示、訂正、削除を請求することができます。アプリの「マイページ」から、いつでもご自身でアカウントと関連データを削除できます。それ以外のご希望がある場合は、下記お問い合わせ先までご連絡ください。合理的な期間内に対応します。
      </LegalSection>

      <LegalSection title="7. お問い合わせ">
        本ポリシーに関するお問い合わせは、{SUPPORT_EMAIL} までご連絡ください。
      </LegalSection>
    </ScreenScroll>
  );
}
