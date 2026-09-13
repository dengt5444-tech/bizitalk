# ビジトーク モバイルアプリ

Web版(`../src`)と同じ内容・デザイン(「Harbor」デザイン言語)を持つ、Expo (React Native) 製のiOS/Androidアプリです。Web版には一切手を加えていません。

## アーキテクチャ

- **バックエンドは共用**: このアプリは独自のサーバーを持たず、Web版と同じ Next.js API ルート(Vercelにデプロイ済みのもの、または `next dev` のローカルサーバー)を呼び出します。Web版はCookieセッションで認証しますが、モバイルにはCookieが無いため `Authorization: Bearer <Supabaseアクセストークン>` ヘッダーで認証します(`../src/lib/supabase/api.ts` の `getAuthedClient()` が両方に対応)。
- **認証**: Supabase Auth をこのアプリから直接呼び出します(`lib/supabase.ts`)。マジックリンクはアプリ内ディープリンクの設定が別途必要になるため、v1では**メール+6桁コード(OTP)**のみに対応しています。
- **公開データの読み取り**(シナリオ一覧・単語帳など)は今後 Supabase に直接アクセスする形で実装予定です。OpenAI/Stripeの秘密鍵に触れる処理(リアルタイム音声トークン発行・チャット・フィードバック生成・TTS・決済)は必ず既存のAPIルート経由にします。
- **決済**: Stripe Checkout / Billing Portal は `expo-web-browser` でアプリ内ブラウザとして開き、`bizitalk://` カスタムURLスキームでアプリに戻ります。

## セットアップ

```bash
cd mobile
npm install
cp .env.example .env
# .env を編集: Supabase の URL/anon key(Web版と同じプロジェクト)と、
# API_BASE_URL に Web版のURL(ローカル開発なら `next dev` のLAN IP、本番ならデプロイ先URL)を設定
npm start
```

Expo Go で開ける機能は一部のみです。**`react-native-webrtc` を使うリアルタイム音声通話機能は、素の Expo Go では動作しません** — カスタム開発ビルド(`npx expo run:ios` / `npx expo run:android`、または [EAS Build](https://docs.expo.dev/build/introduction/))が必要です。

## ディレクトリ構成

```
mobile/
├── app/               # expo-router のファイルベースルーティング(画面)
│   ├── (tabs)/         # ボトムタブ: ホーム/AI会話/リスニング/単語帳/復習/マイページ
│   └── login.tsx
├── components/
│   └── ui/            # Harborデザインの共通UIパーツ(Button, Card, Badge, Text...)
├── context/           # AuthProvider (Supabaseセッション管理)
├── lib/                # supabase client, APIクライアント, 環境変数
└── theme/              # 色・フォントのデザイントークン(../src/app/globals.css と同期)
```

## 既知の制約

- リポジトリが npm workspaces を使わずWeb版(`../`)の中にネストされているため、`expo-doctor` は「重複した依存関係」を警告します。`metro.config.js` で `disableHierarchicalLookup` を有効にし、Metro が親ディレクトリの `node_modules` を解決に使わないようにしているため、実際のバンドルには影響しません(iOS/Android both export 済みで確認済み)。
