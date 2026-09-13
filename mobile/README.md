# ビジトーク モバイルアプリ

Web版(`../src`)と同じ内容・デザイン(「Harbor」デザイン言語)を持つ、Expo (React Native) 製のiOS/Androidアプリです。Web版には一切手を加えていません(バックエンドのAPIルートに、Web版の動作を変えない形でモバイル向けの認証対応を追加しただけです)。

## 実装済み機能

- ログイン(メール + 6桁コード)
- ホーム
- リスニング教材(一覧・詳細・音声再生・スクリプト表示・単語保存・理解度テスト)
- 単語帳(一覧・詳細・単語一覧/フラッシュカード/4択テスト)
- 復習リスト(会話由来+リスニング由来の単語をまとめて一覧・フラッシュカード表示、削除)
- マイページ(継続日数などの統計・フルエンシー推移・おすすめシーン・最近の会話、料金プラン・決済・解約、ログアウト)
- AI会話練習(シーン一覧・詳細、テキストモードでの会話、AIコーチのフィードバック、会話履歴)
- AI会話練習のリアルタイム音声通話(`react-native-webrtc`)— ただし**カスタム開発ビルドでのみ動作**(下記参照)

## アーキテクチャ

- **バックエンドは共用**: このアプリは独自のサーバーを持たず、Web版と同じ Next.js API ルート(Vercelにデプロイ済みのもの、または `next dev` のローカルサーバー)を呼び出します。Web版はCookieセッションで認証しますが、モバイルにはCookieが無いため `Authorization: Bearer <Supabaseアクセストークン>` ヘッダーで認証します(`../src/lib/supabase/api.ts` の `getAuthedClient()` が両方に対応)。
- **認証**: Supabase Auth をこのアプリから直接呼び出します(`lib/supabase.ts`)。マジックリンクはアプリ内ディープリンクの設定が別途必要になるため、v1では**メール+6桁コード(OTP)**のみに対応しています。
- **公開データの読み取り**(教材・単語帳・会話シナリオなど、Web版でもRLSが`using(true)`で誰でも読める設計のテーブル)は Supabase に直接アクセスします。ユーザー本人の行(`saved_words`・`subscriptions`など)もSupabaseのRLSがオーナーのみアクセス可にしているテーブルは、サインイン中のクライアントが自分のJWTを使って直接読み書きします(`lib/entitlements.ts`など)。ただしこれらはUI表示用の簡易チェックに過ぎず、実際の権限チェックは常にサーバー側(既存のAPIルート)が行います。
- **OpenAI/Stripeの秘密鍵に触れる処理**(リアルタイム音声トークン発行・チャット・フィードバック生成・TTS・決済)は必ず既存のAPIルート経由にします。
- **決済**: Stripe Checkout / Billing Portal は `expo-web-browser` の `openAuthSessionAsync` でアプリ内ブラウザとして開き、`bizitalk://` カスタムURLスキームでアプリに戻ります。
- **リアルタイム音声**: `lib/webrtc.ts` が Web版の `ConversationRoom.tsx` の `connectRealtime()` とほぼ同じプロトコル(エフェメラルトークン発行 → SDPをOpenAIへPOST → データチャンネルでイベント送受信)を `react-native-webrtc` で実装しています。ネイティブモジュールが存在しない環境(Expo Go など)では `isRealtimeVoiceSupported()` が `false` を返し、UIはテキストモードのみを提示します(Web版の `RTCPeerConnection` 有無チェックと同じ考え方のフィーチャー検出)。

## セットアップ

```bash
cd mobile
npm install
cp .env.example .env
# .env を編集: Supabase の URL/anon key(Web版と同じプロジェクト)と、
# API_BASE_URL に Web版のURL(ローカル開発なら `next dev` のLAN IP、本番ならデプロイ先URL)を設定
npm start
```

### Expo Go で試せる範囲

上記の `npm start` → Expo Go アプリでQRコードを読み込む、という通常のExpo Goのフローで、**リアルタイム音声通話以外の全機能**が試せます(ログイン、教材、単語帳、復習、マイページ、決済、AI会話のテキストモードなど)。

### リアルタイム音声通話を試すには(カスタム開発ビルドが必要)

`react-native-webrtc` はネイティブモジュールのため、素の Expo Go では動作しません(インポートした瞬間に「WebRTC native module not found」で例外になるのを避けるため、`lib/webrtc.ts` は `isRealtimeVoiceSupported()` で事前にチェックし、無い場合はテキストモードのみを表示します)。実機/シミュレータで音声通話まで試すには、以下のいずれかで**カスタム開発ビルド**を作成してください。

```bash
# ローカルにXcode/Android Studioがある場合
npx expo run:ios
npx expo run:android

# クラウドビルド(ローカルに何も無くてもOK。https://expo.dev のアカウントが必要)
npx eas build --profile development --platform ios
npx eas build --profile development --platform android
```

このクラウド実行環境にはXcode/Android Studioが無いため、コード自体は書けても実機/シミュレータでの動作確認はできていません。上記のビルドはユーザー側の環境(または EAS Build)で行ってください。

## リリースビルド・ストア提出(EAS Build)

`eas.json` に development / preview / production の3つのビルドプロファイルを用意しています。

```bash
npm install -g eas-cli
eas login                 # Expo(https://expo.dev)アカウントでログイン
eas init                  # このプロジェクトをEASに紐付け(app.jsonにprojectIdが追記されます)

# 動作確認用(社内配布・実機テスト向け、開発ビルド/簡易ビルド)
npm run build:preview:ios
npm run build:preview:android

# ストア提出用
npm run build:prod:ios
npm run build:prod:android

# ビルドしたバイナリをストアに提出
npm run submit:ios
npm run submit:android
```

`cli.appVersionSource: "remote"`(`eas.json`)により、バージョン番号(iOSのbuild number・Androidのversion code)はEAS側で自動管理・自動採番されます(`production` プロファイルは `autoIncrement: true`)。

ストア提出(`eas submit`)には、Apple Developer Program / Google Play Console のアカウントでの追加認証が必要です(詳しくは下記「リリースに向けてユーザー側で必要な作業」を参照)。

## ディレクトリ構成

```
mobile/
├── app/                       # expo-router のファイルベースルーティング(画面)
│   ├── (tabs)/
│   │   ├── index.tsx           # ホーム
│   │   ├── conversation/       # AI会話(一覧・詳細・履歴)
│   │   ├── materials/          # リスニング教材(一覧・詳細)
│   │   ├── vocabulary/         # 単語帳(一覧・詳細)
│   │   ├── review.tsx          # 復習リスト
│   │   └── mypage/             # マイページ(統計・料金プラン・決済)
│   └── login.tsx
├── components/
│   ├── ui/                    # Harborデザインの共通UIパーツ(Button, Card, Badge, Text...)
│   ├── conversation/           # ConversationRoom, ChatBubble, FeedbackPanel
│   ├── materials/ vocab/ review/ pricing/ dashboard/
├── context/                    # AuthProvider (Supabaseセッション管理)
├── lib/
│   ├── supabase.ts / api.ts / env.ts
│   ├── webrtc.ts               # リアルタイム音声(react-native-webrtc)
│   ├── entitlements.ts         # UI表示用の権限チェック(実際の権限判定はサーバー側)
│   └── queries/                # 画面ごとのSupabase読み取りクエリ
└── theme/                      # 色・フォントのデザイントークン(../src/app/globals.css と同期)
```

## 既知の制約・今後やるとよいこと

- リポジトリが npm workspaces を使わずWeb版(`../`)の中にネストされているため、`expo-doctor` は「重複した依存関係」を警告します。`metro.config.js` で `disableHierarchicalLookup` を有効にし、Metro が親ディレクトリの `node_modules` を解決に使わないようにしているため、実際のバンドルには影響しません(iOS/Android both export 済みで確認済み)。
- Web版にある実写真のシーンイラスト(`public/images/scenes/*.jpg`)は移植しておらず、バッジ・テキストのみのシンプルな表現にしています。
- マジックリンクによるログイン(アプリ内ディープリンク)は未対応です。6桁コードでのログインのみ実装しています。
- テキストモードでの音声入力(Web版のWeb Speech APIによるディクテーション)は未実装です。
- 紹介プログラムのURL経由(`?ref=`)でのコード自動入力は未対応です(手入力のみ)。
- **iOSでの課金(StoreKit実装済み)**: AppleはApp内で消費するデジタルサブスクリプションにStoreKit(App内課金)の使用を原則義務付けており、このAI会話サービスは外部決済を許可される「リーダーアプリ」の例外に該当しません。iOS版は `expo-iap` を使ったStoreKit購入フローを実装済みです(`components/pricing/PricingPlans.tsx` / `lib/iap.ts`)。Android版は引き続きStripe Checkoutを使用します(ストアはWeb決済を許可)。
  - 購入完了後、StoreKitが返すJWS署名付きトランザクションをバックエンド(`../src/app/api/iap/apple/verify/route.ts`)に送り、Appleの署名を`@apple/app-store-server-library`(Apple公式ライブラリ)で検証してから `subscriptions`/`gakuto_subscriptions` テーブルへ反映します。クライアントの自己申告を信用しない設計です。
  - 更新・解約・返金などの非同期イベントは App Store Server Notifications V2 (`../src/app/api/webhooks/apple/route.ts`) で受け取ります。**App Store Connect側でこのURLを通知先として設定する必要があります**(下記チェックリスト参照)。
  - 「購入を復元」ボタンも実装済みです(端末変更・再インストール後の再同期用)。
  - **ストア審査に出す前に、App Store Connectで4つのサブスクリプション商品(プロダクトID)を作成し、`.env` の `APPLE_PRODUCT_ID_*` と `EXPO_PUBLIC_APPLE_PRODUCT_ID_*` に設定してください** — 詳細は下記の「リリースに向けてユーザー側で必要な作業」を参照。
- アカウント削除は実装済みです(マイページの「アカウントを削除」)。Apple審査ガイドライン5.1.1(v)の要件を満たします。
