# ビジトーク

CEO、海外の同僚、取引先——相手役・シチュエーション別にAIとリアルタイム音声で練習するビジネス英会話サービス。Next.js (App Router, TypeScript, Tailwind) + Supabase + OpenAI (Realtime / TTS / Chat) + Stripe で構築。

「ビジリス」(リスニング教材サイト)とは完全に別プロジェクトです。認証・DB・課金・ドメインすべて独立しています。

## 構成

- **認証**: Supabase Auth(マジックリンク + 6桁コードのフォールバック)
- **AI会話練習**: 4カテゴリー・全18シーン(`conversation_scenarios`)
  - 同僚・日常 / 海外の同僚(インド・シンガポール・イギリス・オーストラリア・ドイツ) / 顧客・取引先 / 経営陣・上司(CEO・CFO)
  - 対応ブラウザでは OpenAI Realtime API(WebRTC, `gpt-realtime`)でマイク⇄AIの低遅延な音声対話を行い、未対応ブラウザ/接続失敗時はテキストのターン制チャットにフォールバック
  - 会話は `conversation_sessions` に保存
- **フィードバック**: 会話終了時、`gpt-4o` が文法・語彙・丁寧さのスコアと添削・語彙提案を生成。実発話由来のフィラー(um, uhなど)を誤って指摘しないようガードしたプロンプトを使用
- **マイページ**(`/dashboard`): 継続日数・週間会話数・フルエンシースコアの推移・保存単語数、次におすすめのシーン
- **会話の記録**(`/conversation/history`): 過去の会話とAIフィードバックをいつでも見返せる
- **音声生成**: OpenAI TTS(`tts-1-hd`、テキストモードのフォールバック音声用)、Supabase Storage(`bizitalk-audio`)にキャッシュ
- **課金**: Stripe Checkout(月額サブスクリプション)+ Webhook。`subscriptions` に状態を同期

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

Vercelにこのリポジトリを接続し、`.env.example` に記載の環境変数を設定してください。
