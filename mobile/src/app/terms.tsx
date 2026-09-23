import { LegalDocument } from "@/components/LegalDocument";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

// Same terms as the website's /terms, plus the App Store purchase terms the
// iOS app needs (Apple's standard EULA applies alongside these).
export default function TermsScreen() {
  return (
    <LegalDocument
      updated="2026-09-23"
      sections={[
        {
          heading: "第1条(適用)",
          paragraphs: [
            `本規約は、${SITE_NAME}(以下「本サービス」といいます)の利用条件を定めるものです。利用者は、本サービスを利用することにより、本規約の内容に同意したものとみなします。`,
          ],
        },
        {
          heading: "第2条(サービス内容)",
          paragraphs: [
            "本サービスは、AIとのリアルタイム音声・テキストによるビジネス英会話練習、会話後のAIコーチによるフィードバック、単語の復習機能を提供するものです。一部シーンは無料で利用でき、その他のシーンの利用には有料プランへの登録が必要です。",
          ],
        },
        {
          heading: "第3条(アカウント)",
          paragraphs: [
            "利用者は、登録したメールアドレスの管理について責任を負うものとします。第三者による不正利用について、当方は故意または重過失がある場合を除き責任を負いません。",
          ],
        },
        {
          heading: "第4条(有料プランと支払い)",
          paragraphs: [
            "有料プランは月額課金制であり、登録した支払い方法により毎月自動的に更新・請求されます。解約は次回更新日の前までにいつでも行うことができ、解約後は次回請求が発生しません。日割りでの返金は行いません。",
            "iPhoneアプリからApp Storeのアプリ内課金でご登録いただいた場合、お支払いはApple IDアカウントに請求され、現在の期間が終了する24時間以上前に自動更新をオフにしない限り自動的に更新されます。解約・管理はApple IDの「サブスクリプション」設定から行えます。返金はAppleの定める方針に従います。App Storeでの購入には、本規約に加えてAppleの標準使用許諾契約(Licensed Application End User License Agreement)が適用されます。",
          ],
        },
        {
          heading: "第5条(禁止事項)",
          paragraphs: [
            "利用者は、本サービスを通じて生成された会話内容・音声・フィードバックを権限なく複製、再配布、または営利目的で第三者に提供してはなりません。また、本サービスの運営を妨害する行為、不正アクセスを試みる行為、AIとの会話を通じて違法・有害なコンテンツの生成を試みる行為を行ってはなりません。",
          ],
        },
        {
          heading: "第6条(免責事項)",
          paragraphs: [
            "本サービスが提供するAIの発話内容・フィードバックの正確性・完全性について保証するものではありません。本サービスの利用により生じた損害について、当方に故意または重過失がある場合を除き、責任を負わないものとします。",
          ],
        },
        {
          heading: "第7条(規約の変更)",
          paragraphs: [
            "当方は、必要と判断した場合、利用者への事前の通知なく本規約を変更できるものとします。変更後の規約は、本ページに掲載した時点から効力を生じるものとします。",
          ],
        },
        {
          heading: "第8条(お問い合わせ)",
          paragraphs: [`本規約に関するお問い合わせは、${SUPPORT_EMAIL} までご連絡ください。`],
        },
      ]}
    />
  );
}
