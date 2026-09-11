import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

export const metadata = { title: `プライバシーポリシー | ${SITE_NAME}` };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-14 sm:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink">
        プライバシーポリシー
      </h1>
      <p className="mt-2 text-sm text-ink-faint">
        最終更新日: {new Date().toISOString().slice(0, 10)}
      </p>

      <div className="mt-8 space-y-6 text-ink-soft">
        <section>
          <h2 className="font-display font-semibold text-ink">
            1. 取得する情報
          </h2>
          <p className="mt-2 leading-relaxed">
            本サービスは、ログインのためのメールアドレス、AI会話練習の記録(会話内容・AIコーチのフィードバック・復習リストに保存した単語など)、
            および有料プランご利用の場合は決済サービス(Stripe)を通じて処理される決済情報を取得します。
            クレジットカード番号そのものは当方のサーバーには保存されません。
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-ink">
            2. マイクの音声データについて
          </h2>
          <p className="mt-2 leading-relaxed">
            リアルタイム音声モードでは、ご利用中のブラウザからOpenAI社のRealtime
            APIへ、マイクの音声データが直接送信されます(当方のサーバーを経由しません)。
            会話終了後、当方のサーバーには音声そのものではなく、文字起こしされた会話内容とAIコーチのフィードバックのみが保存されます。
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-ink">
            3. 利用目的
          </h2>
          <p className="mt-2 leading-relaxed">
            取得した情報は、本サービスの提供、ログイン認証、有料プランの管理、
            サービス改善のための分析、お問い合わせへの対応のために利用します。
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-ink">
            4. 第三者への提供・委託
          </h2>
          <p className="mt-2 leading-relaxed">
            本サービスは、以下の外部サービスを利用しており、必要な範囲でこれらの事業者に情報を取り扱わせています。
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Supabase(認証・データベースの保管)</li>
            <li>OpenAI(AI会話・リアルタイム音声・フィードバック生成)</li>
            <li>Stripe(決済処理)</li>
            <li>Vercel(サービスのホスティング)</li>
          </ul>
          <p className="mt-2 leading-relaxed">
            法令に基づく場合を除き、これら以外の第三者に個人情報を提供することはありません。
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-ink">
            5. Cookieの利用
          </h2>
          <p className="mt-2 leading-relaxed">
            本サービスは、ログイン状態を維持するためにCookieを利用します。
            Cookieを無効化した場合、一部機能が正常に動作しない場合があります。
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-ink">
            6. 情報の開示・削除請求
          </h2>
          <p className="mt-2 leading-relaxed">
            利用者は、自身の個人情報の開示、訂正、削除を請求することができます。
            ご希望の場合は、下記お問い合わせ先までご連絡ください。合理的な期間内に対応します。
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-ink">
            7. お問い合わせ
          </h2>
          <p className="mt-2 leading-relaxed">
            本ポリシーに関するお問い合わせは、{SUPPORT_EMAIL} までご連絡ください。
          </p>
        </section>
      </div>
    </main>
  );
}
