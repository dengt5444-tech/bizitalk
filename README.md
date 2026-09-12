# ビジトーク

CEO、海外の同僚、取引先——相手役・シチュエーション別にAIとリアルタイム音声で練習するビジネス英会話サービス。Next.js (App Router, TypeScript, Tailwind) + Supabase + OpenAI (Realtime / TTS / Chat) + Stripe で構築。

「ビジリス」(リスニング教材サイト)とは別リポジトリ・別ドメイン・別ブランドの独立したプロダクトです。GitHubリポジトリ・Vercelプロジェクト・Stripeの商品は別々ですが、**Supabaseプロジェクト(認証・DB・Storage)はビジリスと共用**しています。詳しくは「リスニング教材」セクション参照。

## 構成

- **認証**: Supabase Auth(マジックリンク + 6桁コードのフォールバック)
- **AI会話練習**(月額¥2,980プラン): 4カテゴリー・全18シーン(`conversation_scenarios`)
  - 同僚・日常 / 海外の同僚(インド・シンガポール・イギリス・オーストラリア・ドイツ) / 顧客・取引先 / 経営陣・上司(CEO・CFO)
  - 各キャラクターは背景に応じたアクセント(インド英語・イギリス英語・オーストラリア英語・ドイツ訛りなど)で話すよう `system_prompt` で指示しており、実在の相手と話しているような没入感とアクセント学習の両方を狙っている
  - 対応ブラウザでは OpenAI Realtime API(WebRTC, `gpt-realtime`)でマイク⇄AIの低遅延な音声対話を行い、未対応ブラウザ/接続失敗時はテキストのターン制チャットにフォールバック
  - 会話は `conversation_sessions` に保存。**月あたりのセッション数に上限あり**(`src/lib/limits.ts` の `MAX_CONVERSATION_SESSIONS_PER_MONTH`)。リアルタイム音声APIには実コストがかかるため、割引価格でも赤字にならないよう設定した安全マージン付きの上限
- **フィードバック**: 会話終了時、`gpt-4o` が文法・語彙・丁寧さのスコアと添削・語彙提案を生成。実発話由来のフィラー(um, uhなど)を誤って指摘しないようガードしたプロンプトを使用
- **マイページ**(`/dashboard`): 継続日数・週間会話数・フルエンシースコアの推移・保存単語数、次におすすめのシーン
- **会話の記録**(`/conversation/history`): 過去の会話とAIフィードバックをいつでも見返せる
- **音声生成**: OpenAI TTS(`tts-1-hd`、テキストモードのフォールバック音声用)、Supabase Storage(`bizitalk-audio`)にキャッシュ
- **課金**: Stripe Checkout(月額サブスクリプション、2プラン)+ Webhook。プランごとに別テーブル(下記参照)に状態を同期

### リスニング教材(月額¥490プラン)

- ビジリスの `gakuto_materials` / `gakuto_saved_words` / `gakuto_subscriptions` テーブルをそのまま参照する形で、`/materials` にリスニング教材機能を実装しています(同一Supabaseプロジェクトを共用しているため、コンテンツやTTSキャッシュ(`gakuto-audio`バケット)をそのまま再利用でき、データ移行は不要でした)。
- AI会話プランとは**別のエンティトルメント**です: AI会話は本アプリ自身の `subscriptions` テーブル、リスニングは `gakuto_subscriptions` テーブルで判定しており、どちらか一方に登録してももう片方は解放されません(`src/lib/entitlements.ts` の `isEntitled` / `isListeningEntitled`)。
- リスニング音声は一度生成してキャッシュを使い回す仕組みのため、AI会話のような利用回数の上限は設けていません(聞き放題)。
- 復習リスト(`/review`)は、AI会話由来の単語(`saved_words`)とリスニング教材由来の単語(`gakuto_saved_words`)を1つの画面にまとめて表示します。

### リアルタイム音声について

- OpenAI アカウントで Realtime API (`gpt-realtime`) が利用可能である必要があります。追加の環境変数は不要で、既存の `OPENAI_API_KEY` を使用します。
- ブラウザは `RTCPeerConnection` とマイク(`getUserMedia`)に対応している必要があります(主要モダンブラウザは対応)。未対応の場合は自動的にテキストモードのみが表示されます。
- 音声はブラウザとOpenAIの間でWebRTC経由の直接通信となり、サーバーは音声データを中継しません(エフェメラルトークンの発行と、会話終了後の文字起こし保存のみ担当)。

## デザイン

「Harbor」という独自のデザイン言語を採用しています。冷たさのある紙色の背景・深いネイビーの文字・信頼感のある青(signal)のアクセント・琥珀色(amber)の副アクセントで構成し、見出しは明朝体(Zen Old Mincho)、本文はNoto Sans JPを使用しています(`src/app/globals.css` の `@theme` ブロックでトークン定義)。人物アイコンは絵文字ではなく、名前から生成したイニシャル(`src/components/Avatar.tsx`)を使用しています。

## 開発

```bash
npm install
npm run dev
```

`.env.example` を参考に `.env.local` を用意してください。

### 初回セットアップ

1. Supabaseプロジェクトを作成し、SQL Editorで `supabase/migrations/0001_init.sql` を実行
2. 以下のスクリプトを実行(`NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` を環境変数として読み込みます)

```bash
# Supabase Storage に音声キャッシュ用バケットを作成
node scripts/setup-storage.mjs

# AI会話練習のシーンを投入(全18シーン)
node scripts/seed-conversation-scenarios.mjs
```

## デプロイ

Vercelにこのリポジトリを接続し、`.env.example` に記載の環境変数を設定してください。`STRIPE_PRICE_ID`(AI会話プラン)と `STRIPE_PRICE_ID_LISTENING`(リスニングプラン)は別々のStripe価格IDです。

## 紹介プログラムについて

AI会話プランの購入時に紹介者へ¥1,000を支払う仕組みは、`MAX_CONVERSATION_SESSIONS_PER_MONTH` の算出(`src/lib/limits.ts`)で「全購入が紹介経由」という最悪ケースとしてコストに織り込み済みですが、紹介コードの発行・追跡・支払いそのものの仕組みはまだ実装していません(スコープ外として保留中)。
