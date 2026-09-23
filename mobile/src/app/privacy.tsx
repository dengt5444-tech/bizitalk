import { LegalDocument } from "@/components/LegalDocument";
import { SUPPORT_EMAIL } from "@/lib/site";

// Same policy as the website's /privacy, with the app-specific points
// (microphone access, App Store payments, on-device login storage).
export default function PrivacyScreen() {
  return (
    <LegalDocument
      updated="2026-09-23"
      sections={[
        {
          heading: "1. 取得する情報",
          paragraphs: [
            "本サービスは、ログインのためのメールアドレス、AI会話練習の記録(会話内容・AIコーチのフィードバック・復習リストに保存した単語など)、および有料プランご利用の場合は決済サービス(Stripe、またはiPhoneアプリの場合はApple)を通じて処理される決済情報を取得します。クレジットカード番号そのものは当方のサーバーには保存されません。",
          ],
        },
        {
          heading: "2. マイクの音声データについて",
          paragraphs: [
            "リアルタイム音声モードでは、ご利用中のブラウザまたはアプリからOpenAI社のRealtime APIへ、マイクの音声データが直接送信されます(当方のサーバーを経由しません)。アプリはマイクへのアクセスを、あなたがリアルタイム音声での会話を開始したときにのみ使用します。会話終了後、当方のサーバーには音声そのものではなく、文字起こしされた会話内容とAIコーチのフィードバックのみが保存されます。",
          ],
        },
        {
          heading: "3. 利用目的",
          paragraphs: [
            "取得した情報は、本サービスの提供、ログイン認証、有料プランの管理、サービス改善のための分析、お問い合わせへの対応のために利用します。広告目的のトラッキングは行いません。",
          ],
        },
        {
          heading: "4. 第三者への提供・委託",
          paragraphs: ["本サービスは、以下の外部サービスを利用しており、必要な範囲でこれらの事業者に情報を取り扱わせています。"],
          bullets: [
            "Supabase(認証・データベースの保管)",
            "OpenAI(AI会話・リアルタイム音声・フィードバック生成)",
            "Stripe(決済処理)",
            "Apple(iPhoneアプリでの決済処理)",
            "Vercel(サービスのホスティング)",
          ],
          after: ["法令に基づく場合を除き、これら以外の第三者に個人情報を提供することはありません。"],
        },
        {
          heading: "5. Cookie・端末内の保存について",
          paragraphs: [
            "Webサイトでは、ログイン状態を維持するためにCookieを利用します。アプリでは、ログイン状態を維持するための情報を端末内に保存します。Cookieを無効化した場合、一部機能が正常に動作しない場合があります。",
          ],
        },
        {
          heading: "6. 情報の開示・削除請求",
          paragraphs: [
            "利用者は、自身の個人情報の開示、訂正、削除を請求することができます。マイページから、いつでもご自身でアカウントと関連データを削除できます。それ以外のご希望がある場合は、下記お問い合わせ先までご連絡ください。合理的な期間内に対応します。",
          ],
        },
        {
          heading: "7. お問い合わせ",
          paragraphs: [`本ポリシーに関するお問い合わせは、${SUPPORT_EMAIL} までご連絡ください。`],
        },
      ]}
    />
  );
}
