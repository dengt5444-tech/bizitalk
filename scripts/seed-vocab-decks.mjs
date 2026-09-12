import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const decks = [
  {
    slug: "foreign-company-basics",
    title: "外資系ビジネス英単語",
    description:
      "外資系企業のミーティングやメールで頻出する、定番のビジネス英単語・表現を集めました。",
    category: "foreign-company",
    order_index: 1,
    is_free: true,
    items: [
      { word: "leverage", meaning: "活用する、てこの原理で利益を得る", example: "We should leverage our existing customer base to launch the new product." },
      { word: "synergy", meaning: "相乗効果", example: "The merger created strong synergy between the two teams." },
      { word: "stakeholder", meaning: "利害関係者", example: "We need buy-in from all key stakeholders before moving forward." },
      { word: "deliverable", meaning: "成果物", example: "Can you share the deliverables for this project by Friday?" },
      { word: "headcount", meaning: "人員数", example: "We're increasing headcount in the engineering team next quarter." },
      { word: "KPI", meaning: "重要業績評価指標(Key Performance Indicator)", example: "Our main KPI this quarter is customer retention." },
      { word: "bandwidth", meaning: "(人の)対応できる余力・時間", example: "I don't have the bandwidth to take on another project right now." },
      { word: "touch base", meaning: "軽く連絡を取る、近況を確認する", example: "Let's touch base next week on the proposal." },
      { word: "circle back", meaning: "後で改めて話す・戻る", example: "I'll circle back to you once I have an answer from legal." },
      { word: "actionable", meaning: "実行可能な、具体的な", example: "We need actionable next steps, not just ideas." },
      { word: "alignment", meaning: "意思統一、足並みを揃えること", example: "Let's make sure we're in alignment before the client call." },
      { word: "escalate", meaning: "上位者に報告・エスカレーションする", example: "If the issue isn't resolved by tomorrow, please escalate it to me." },
      { word: "buy-in", meaning: "賛同、合意", example: "We need executive buy-in for this initiative to succeed." },
      { word: "runway", meaning: "(資金が尽きるまでの)残り期間", example: "The startup has about 18 months of runway left." },
      { word: "onboarding", meaning: "新入社員研修、受け入れ対応", example: "The onboarding process for new hires takes about two weeks." },
      { word: "low-hanging fruit", meaning: "簡単に成果を出せる案件", example: "Let's start with the low-hanging fruit before tackling bigger issues." },
      { word: "take offline", meaning: "(この場でなく)別途話す", example: "Let's take this discussion offline and follow up by email." },
      { word: "rank and file", meaning: "一般社員、平社員", example: "The announcement affected everyone, from executives to the rank and file." },
    ],
  },
  {
    slug: "working-holiday-workplace",
    title: "ワーホリ・海外就労で使う実務英語",
    description:
      "ワーキングホリデーや海外での就労で、実際の職場(シフト・給与・雇用条件)で使う実務英語を集めました。",
    category: "working-holiday",
    order_index: 2,
    is_free: false,
    items: [
      { word: "shift", meaning: "勤務シフト", example: "Can we swap shifts this Friday?" },
      { word: "roster", meaning: "勤務表、シフト表", example: "The new roster comes out every Monday." },
      { word: "minimum wage", meaning: "最低賃金", example: "The minimum wage here is higher than back home." },
      { word: "payslip", meaning: "給与明細", example: "You should check your payslip for any errors." },
      { word: "supervisor", meaning: "上司、監督者", example: "Please ask your supervisor if you need time off." },
      { word: "casual employee", meaning: "非正規・時給制でシフト制の従業員", example: "I started as a casual employee at the cafe." },
      { word: "probation period", meaning: "試用期間", example: "New staff go through a three-month probation period." },
      { word: "notice period", meaning: "退職通知期間", example: "You need to give two weeks' notice before quitting." },
      { word: "resume", meaning: "履歴書", example: "Make sure your resume highlights your customer service experience." },
      { word: "reference", meaning: "推薦者、身元保証人", example: "Can I use you as a reference for my next job application?" },
      { word: "induction", meaning: "新人研修、オリエンテーション", example: "All new employees attend an induction session on their first day." },
      { word: "work rights", meaning: "就労資格", example: "You'll need to show proof of your work rights before starting." },
      { word: "tax file number", meaning: "納税者番号(オーストラリアなど)", example: "You can't get paid properly without a tax file number." },
      { word: "superannuation", meaning: "退職年金積立(オーストラリア)", example: "Your employer contributes to your superannuation automatically." },
      { word: "rostered day off", meaning: "シフト制における休日(RDO)", example: "I have a rostered day off this Wednesday." },
      { word: "give someone a hand", meaning: "手伝う", example: "Could you give me a hand with these deliveries?" },
      { word: "call in sick", meaning: "病欠の連絡をする", example: "I had to call in sick this morning." },
      { word: "clock in/out", meaning: "出退勤の打刻をする", example: "Don't forget to clock in when your shift starts." },
    ],
  },
];

for (const deck of decks) {
  const { error } = await supabase
    .from("vocab_decks")
    .upsert(deck, { onConflict: "slug" });

  if (error) {
    console.error(`Failed to seed "${deck.slug}":`, error.message);
    process.exit(1);
  }

  console.log(`Seeded vocab deck: ${deck.slug} (${deck.items.length} words)`);
}

console.log(`Done. Seeded ${decks.length} vocab decks.`);
