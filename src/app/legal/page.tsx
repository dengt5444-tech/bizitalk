import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

export const metadata = { title: `特定商取引法に基づく表記 | ${SITE_NAME}` };

const ROWS: [string, string][] = [
  ["販売事業者名", "渡邊 岳登"],
  ["運営責任者", "渡邊 岳登"],
  [
    "所在地",
    "ご請求いただき次第、遅滞なく開示いたします。",
  ],
  [
    "電話番号",
    "ご請求いただき次第、遅滞なく開示いたします。",
  ],
  ["メールアドレス", SUPPORT_EMAIL],
  [
    "販売価格",
    "各プランの月額料金は、料金ページに表示の金額(税込)によります。現在は先行提供価格でのご案内です。各プランの正式価格(先行提供価格終了後の価格)も料金ページに明記しています。",
  ],
  ["商品代金以外の必要料金", "インターネット接続料金・通信料金はお客様のご負担となります"],
  ["お支払い方法", "クレジットカード決済(Stripe社の決済システムを利用)"],
  [
    "お支払い時期",
    "ご登録時に初回のお支払いが発生し、以降は毎月同日に自動更新・自動課金されます",
  ],
  [
    "サービスの提供時期",
    "決済完了後、直ちにご利用いただけます",
  ],
  [
    "返品・キャンセルについて",
    "デジタルサービスの性質上、提供済みのサービスに対する返金は原則として行いません。解約はマイページからいつでも行うことができ、解約後は次回以降の請求は発生しません(日割り返金はありません)。",
  ],
];

export default function LegalPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-14 sm:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink">
        特定商取引法に基づく表記
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-soft">
        「特定商取引に関する法律」第11条に基づき、以下のとおり表示します。
      </p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-line">
        <table className="w-full border-collapse text-sm">
          <tbody>
            {ROWS.map(([label, value]) => (
              <tr key={label} className="border-b border-line last:border-b-0">
                <th className="w-40 shrink-0 bg-paper-dim p-4 text-left align-top font-semibold text-ink">
                  {label}
                </th>
                <td className="p-4 align-top text-ink-soft">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
