# ビジトーク

CEO、海外の同僚、取引先——相手役・シチュエーション別にAIとリアルタイム音声で練習するビジネス英会話サービス。Next.js (App Router, TypeScript, Tailwind) + Supabase + OpenAI (Realtime / TTS / Chat) + Stripe で構築。

「ビジリス」(リスニング教材サイト)とは別リポジトリ・別ドメイン・別ブランドの独立したプロダクトです。GitHubリポジトリ・Vercelプロジェクト・Stripeの商品は別々ですが、**Supabaseプロジェクト(認証・DB・Storage)はビジリスと共用**しています。詳しくは「リスニング教材」セクション参照。

## 料金プラン

4プラン制です(すべて月額サブスクリプション、Stripeの別々の価格として管理):

| プラン | 価格 | 内容 |
| --- | --- | --- |
| リスニング | ¥490 | リスニング教材が聞き放題(AI会話は不可) |
| お試し | ¥980 | AI会話 月`trial`分 + リスニング聞き放題 |
| スタンダード | ¥4,990 | AI会話 月`standard`分 + リスニング聞き放題 |
| 使い放題 | ¥9,900 | AI会話 実質使い放題(`unlimited`分/月の余裕あるフェアユース上限)+ リスニング聞き放題 |

分数の実値は `src/lib/limits.ts` の `CONVERSATION_MINUTES_PER_MONTH` 参照。リスニングは全プラン(リスニング単体プランおよびAI会話3プランいずれか)で利用可能。

## 構成

- **認証**: Supabase Auth(マジックリンク + コード入力のフォールバック)。メール送信はResendのカスタムSMTP経由(独自ドメイン `bizitalkapp.com` を使用)
- **AI会話練習**: 4カテゴリー・全26シーン + フリートークモード(`conversation_scenarios`)
  - 同僚・日常 / 海外の同僚(インド・シンガポール・イギリス・オーストラリア・ドイツ) / 顧客・取引先 / 経営陣・上司(CEO・CFO)
  - **フリートーク**: 固定のシーン・相手役ではなく、話したいテーマを自分で指定して(空欄でもOK)AIと自由形式の会話を練習できるモード。指定したテーマは `conversation_sessions.custom_topic` に保存し、テキストモードの返信生成・リアルタイム音声の指示・冒頭の挨拶いずれにも反映(`src/lib/conversation.ts` の `withCustomTopic` / `freeTalkOpeningLine`)。テーマ未指定の場合はAIが幅広いビジネス系の話題を提案します。
  - 対応ブラウザでは OpenAI Realtime API(WebRTC, `gpt-realtime`)でマイク⇄AIの低遅延な音声対話を行い、未対応ブラウザ/接続失敗時はテキストのターン制チャットにフォールバック
  - 会話は `conversation_sessions` に保存。**プランごとに月あたりの利用時間(分)に上限あり**(`src/lib/limits.ts`)。セッション数ではなく実際に話した分数で上限を管理しており、リアルタイム音声の接続開始時刻をサーバー側で記録して(クライアント申告ではなく)会話終了時に利用時間を算出・積算する仕組み。リアルタイム音声APIには実コストがかかるため、各プランの割引価格でも赤字にならないよう設定した安全マージン付きの上限。どのAI会話プランに入っているかは、本アプリの `subscriptions` テーブルに保存された `price_id` がどの環境変数の価格と一致するかで判定(`src/lib/entitlements.ts` の `getConversationPlan`)
- **フィードバック**: 会話終了時、`gpt-4o` が文法・語彙・丁寧さのスコアと添削・語彙提案を生成。実発話由来のフィラー(um, uhなど)を誤って指摘しないようガードしたプロンプトを使用
- **マイページ**(`/dashboard`): 継続日数・週間会話数・フルエンシースコアの推移・保存単語数、次におすすめのシーン
- **会話の記録**(`/conversation/history`): 過去の会話とAIフィードバックをいつでも見返せる
- **音声生成**: OpenAI TTS(`tts-1-hd`、テキストモードのフォールバック音声用)、Supabase Storage(`bizitalk-audio`)にキャッシュ
- **課金**: Stripe Checkout(月額サブスクリプション、4プラン)+ Webhook

### リスニング教材

- ビジリスの `gakuto_materials` / `gakuto_saved_words` / `gakuto_subscriptions` テーブルをそのまま参照する形で、`/materials` にリスニング教材機能を実装しています(同一Supabaseプロジェクトを共用しているため、コンテンツやTTSキャッシュ(`gakuto-audio`バケット)をそのまま再利用でき、データ移行は不要でした)。
- リスニング単体プラン(¥490)は `gakuto_subscriptions` テーブルで判定。AI会話の3プラン(お試し・スタンダード・使い放題)にはリスニングが**バンドル**されており、いずれかに登録していれば別途リスニングプランに入っていなくても聞き放題になります(`src/lib/entitlements.ts` の `isListeningEntitled`)。
- リスニング音声は一度生成してキャッシュを使い回す仕組みのため、AI会話のような利用回数の上限は設けていません(聞き放題)。
- 復習リスト(`/review`)は、AI会話由来の単語(`saved_words`)とリスニング教材由来の単語(`gakuto_saved_words`)を1つの画面にまとめて表示します。一覧表示に加えて、シャッフルしたフラッシュカード形式(単語⇄意味をタップで切り替え、「覚えていた/もう一度」で仕分け)で復習できるモードも用意しています(`src/components/ReviewWordsView.tsx`)。

### 単語帳(`/vocabulary`)

- ビジリスとは共有せず、BizTalk独自のテーブル(`vocab_decks`)にビジネス英単語帳を持っています。全12単語帳・合計506語(会議・交渉・プレゼン・ビジネスメール・財務会計・マーケティング営業・人事採用・プロジェクトマネジメント・リーダーシップ・スタートアップ・外資系企業・ワーホリ実務英語)をテーマ別に収録しています。単語帳ごとにテーマと単語リスト(単語・意味・例文)を持ちます。
- 各単語帳は「単語一覧」「フラッシュカード」「4択テスト」の3モードで学習できます(`src/components/VocabDeckPractice.tsx`)。4択テストの選択肢は単語帳内の他の単語の意味から自動生成しており、テスト問題を個別に作成する必要はありません。
- テストで間違えた単語は(AI会話のフィードバックと同じ)`saved_words` テーブルに保存され、`/review` の復習リストにも表示されます。
- リスニングと同様、リスニングプランまたはAI会話の各プランのいずれかで全単語帳が解放されます。1つの単語帳は無料お試しとして公開しています。

### リアルタイム音声について

- OpenAI アカウントで Realtime API (`gpt-realtime`) が利用可能である必要があります。追加の環境変数は不要で、既存の `OPENAI_API_KEY` を使用します。
- ブラウザは `RTCPeerConnection` とマイク(`getUserMedia`)に対応している必要があります(主要モダンブラウザは対応)。未対応の場合は自動的にテキストモードのみが表示されます。
- 音声はブラウザとOpenAIの間でWebRTC経由の直接通信となり、サーバーは音声データを中継しません(エフェメラルトークンの発行と、会話終了後の文字起こし保存のみ担当)。

## デザイン

「Harbor」という独自のデザイン言語を採用しています。冷たさのある紙色の背景・深いネイビーの文字・信頼感のある青(signal)のアクセント・琥珀色(amber)の副アクセントで構成し、見出しは明朝体(Zen Old Mincho)、本文はNoto Sans JPを使用しています(`src/app/globals.css` の `@theme` ブロックでトークン定義)。人物アイコンは絵文字ではなく、名前から生成したイニシャル(`src/components/Avatar.tsx`)を使用しています。

ホームページの装飾(`HeroIllustration`)と会話カテゴリーのバッジ(`CategoryIllustration`)は、ブランドカラーで統一した抽象的なグラデーションイラスト(`src/components/illustrations/`)です。

一方、各会話シーン・各リスニング教材が「どんな状況か」を実感できるよう、一覧カードと詳細ページには実写真を使用しています(`src/components/illustrations/SceneIllustration.tsx`)。シーンの種類(会議・商談・面接・プレゼン・カフェでの雑談など9パターン)ごとに1枚、Pexels(商用利用無料・クレジット表記不要のPexels Licenseで提供)からダウンロードして `public/images/scenes/` に保存しており、外部サイトへのホットリンクではありません。人物の顔が写る写真は、特定の実在人物ではなく一般的なシチュエーションを表す目的でのみ使用しており、AIキャラクターの「顔」としては扱っていません(キャラクター自体のアイコンは引き続き名前から生成したイニシャルです)。

## 開発

```bash
npm install
npm run dev
```

`.env.example` を参考に `.env.local` を用意してください。

### 初回セットアップ

1. Supabaseプロジェクトを作成し、SQL Editorで `supabase/migrations/0001_init.sql` → `0002_vocab_decks.sql` → `0003_conversation_minutes.sql` → `0004_free_talk.sql` → `0005_referrals.sql` → `0006_influencer_referrals.sql` → `0007_waitlist.sql` の順に実行
2. 以下のスクリプトを実行(`NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` を環境変数として読み込みます)

```bash
# Supabase Storage に音声キャッシュ用バケットを作成
node scripts/setup-storage.mjs

# AI会話練習のシーンを投入(全26シーン + フリートーク)
node scripts/seed-conversation-scenarios.mjs

# 単語帳を投入
node scripts/seed-vocab-decks.mjs
```

## デプロイ

Vercelにこのリポジトリを接続し、`.env.example` に記載の環境変数を設定してください。`STRIPE_PRICE_ID`(スタンダード)・`STRIPE_PRICE_ID_TRIAL`(お試し)・`STRIPE_PRICE_ID_UNLIMITED`(使い放題)・`STRIPE_PRICE_ID_LISTENING`(リスニング)は、それぞれ別々のStripe価格IDです。

## エラー監視(Sentry)

`@sentry/nextjs` を導入済みですが、`SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` を設定するまでは何も送信しない安全な無効状態です。本番運用を始める前に、Sentryで無料アカウントを作成しDSNを発行してから、Vercelの環境変数に設定してください。`SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` はソースマップのアップロード(スタックトレースを読みやすくする)にのみ使用し、未設定でもビルドは通ります。

## 管理者ページ

`ADMIN_EMAILS` に登録したメールアドレスでログインすると `/admin` から以下を確認できます:

- `/admin/usage`: 今月のAI会話(リアルタイム音声)の利用時間・プラン別の内訳・`src/lib/limits.ts` の見積もりコスト(¥16/分)での推定金額。OpenAIの実際の請求額と比較することで、この見積もりが正しいか検証できます。
- `/admin/referrals`: 発行済みの紹介コードごとの登録数・有効化数。
- `/admin/waitlist`: `/early-access` から登録されたメールアドレスの一覧。

## 先行モニター募集ページ(`/early-access`)

正式リリース前に、SNSなどで告知して先行モニターを募集するための単独ランディングページです。メールアドレスを入力すると `waitlist` テーブルに保存されます(重複登録は自動的にエラーにせず「登録済み」として扱います)。ログイン不要・匿名で使えます。

## 将来のネイティブアプリ化について

iOS/Android向けのネイティブアプリを検討する際は、Apple/Googleの課金ポリシー(アプリ内課金の義務化・手数料)を先に確認してください。詳細は [`docs/app-store-billing.md`](docs/app-store-billing.md) にまとめています。

## 紹介プログラムについて

AI会話プランの購入時に紹介者へ¥1,000を支払う仕組みは、`src/lib/limits.ts` の各プランの上限(分)を算出する際に「全購入が紹介経由」という最悪ケースとしてコストに織り込み済みです(ただし¥980のお試しプランは、¥1,000の紹介料がプラン価格そのものを上回ってしまうため、このプランについては紹介コストなしとして計算しています)。

紹介コードは、インフルエンサーなど**運営が選んだ相手にのみ手動で発行**する形にしています(一般ユーザーへの自動発行はしていません)。

- 新しいコードの発行: `node scripts/create-referral-code.mjs <コード> "<ラベル(表示用の名前)>"`(例: `node scripts/create-referral-code.mjs YUKI2026 "Yuki (YouTube)"`)
- 発行したコードは `/pricing?ref=コード` のリンクとして紹介者に渡すか、コードそのものを伝えて `/pricing` の紹介コード入力欄(`ReferralCodeField`)に入力してもらいます(入力値は `localStorage` に保存され、決済時に `/api/checkout` へ送信)。
- Stripeのサブスクリプションのmetadataにコードを載せ、Webhookで該当ユーザーが実際に有料登録した時点で `referral_redemptions` テーブルに記録します(`status: "pending"` → 初回有効化で `"rewarded"`、以後は解約されても後退しません)。
- 発行済みコードごとの登録数・有効化数は `/admin/referrals`(`ADMIN_EMAILS` のみアクセス可)で確認できます。
- **実際の紹介料の支払い(振込など)そのものはまだ自動化していません**。`/admin/referrals` で `status = 'rewarded'` になっているコードを見て、運営側で手動送金する運用を想定しています。
