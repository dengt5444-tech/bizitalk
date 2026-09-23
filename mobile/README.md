# ビジトーク iOS / Android アプリ

Webサイト(`../src`)と同じ機能・同じプラン・同じアカウントで使える、Expo(React Native)製のアプリです。まずはiOS(App Store)でのリリースを前提に作っています。

## できること(Webサイトと同じ)

| 機能 | 画面 |
| --- | --- |
| ログイン(Webサイトと同じメールアドレス・同じアカウント) | `src/app/login.tsx` |
| ホーム | `src/app/(tabs)/index.tsx` |
| AI会話練習: 全カテゴリー・全シーン、フリートーク、**リアルタイム音声**/テキスト、ヒント(ガイド付きモード)、会話後のAIコーチのフィードバック | `src/app/(tabs)/conversation.tsx`, `src/app/conversation/[slug].tsx` |
| 会話の記録 | `src/app/history/` |
| リスニング教材(音声再生・スクリプト・重要単語・理解度テスト)— 無料 | `src/app/(tabs)/materials.tsx`, `src/app/materials/[slug].tsx` |
| 単語帳(一覧・フラッシュカード・4択テスト)— 無料 | `src/app/(tabs)/vocabulary.tsx`, `src/app/vocabulary/[slug].tsx` |
| 復習リスト(一覧・フラッシュカード・削除) | `src/app/review.tsx` |
| マイページ(継続日数・フルエンシー推移・おすすめシーン・最近の会話・アカウント削除) | `src/app/(tabs)/mypage.tsx` |
| 料金プラン(お試し ¥980 / スタンダード ¥4,990 / 使い放題 ¥9,900) | `src/app/pricing.tsx` |
| 利用規約・プライバシーポリシー・特定商取引法に基づく表記 | `src/app/terms.tsx` ほか |

## しくみ

- **アカウントはWebサイトと共通**: Webサイトと同じSupabaseプロジェクトのSupabase Authを使います。同じメールアドレスでログインすれば、会話の記録・復習リスト・プランがそのまま共有されます。
  - ログインは「メールに届く数字のコード」で行います(Webサイトのログインメールにはリンクとコードの両方が入っています。リンクはWebサイト用、アプリではコードを使います)。
  - 「パスワードでログイン」も用意しています(App Storeの審査用アカウントで使います。通常の利用者はコードでログインします)。
- **サーバーはWebサイトと共通**: アプリは独自のサーバーを持たず、Webサイト(Vercel)のAPIをそのまま呼び出します。Webサイトはログイン状態をCookieで扱いますが、アプリは `Authorization: Bearer <Supabaseのアクセストークン>` を送ります(サーバー側 `../src/lib/supabase/api.ts` が両方に対応済み)。
- **リアルタイム音声**: iOSに標準で入っているWebKitのWebRTC(Safariと同じもの)を、画面に見えないWebView(`react-native-webview`、Expo公式サポート)の中で動かしています(`src/lib/realtime/`)。Webサイトの会話ロジック(AIの声のエコーや雑音に反応しない仕組みなど)をそのまま移植しています。以前のアプリがビルドできなかった主な原因だった `react-native-webrtc`(New Architecture未検証のネイティブモジュール)は使っていません。
- **iOSの課金**: Appleの規約上、iOSアプリ内ではApp Storeのアプリ内課金(StoreKit)で販売する必要があるため、`expo-iap` で購入します(`src/lib/iap/`)。購入はWebサイトのサーバー(`/api/iap/apple/verify`)がAppleの署名を検証してから反映します。Webサイト(Stripe)で登録済みのプランは、アプリでもそのまま使えます。
- **Android**: 同じコードで動きます。課金はWebサイトと同じStripe(アプリ内ブラウザ)を使います。

## セットアップ

```bash
cd mobile
npm install
cp .env.example .env   # 値を記入(下記)
npx expo start
```

`.env` に設定する値(すべて公開して問題ない値です):

| 変数 | 値 |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` | **Webサイトと同じ** Supabaseプロジェクトの値(Vercelの `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` と同じ) |
| `EXPO_PUBLIC_API_BASE_URL` | WebサイトのURL(例: `https://bizitalkapp.com`、末尾の `/` なし) |
| `EXPO_PUBLIC_APPLE_PRODUCT_ID_TRIAL` / `_ID` / `_ID_UNLIMITED` | App Store Connectで作るサブスクリプションのプロダクトID(Vercelの `APPLE_PRODUCT_ID_*` と同じ値) |

EASでクラウドビルドする場合は、同じ値をEASの環境変数(production / preview / development)にも登録してください(`RELEASE_CHECKLIST.md` 参照)。

### 動作確認の方法

- **Expo Go**(App Storeの「Expo Go」アプリ)で `npx expo start` のQRコードを読み込めば、**課金以外のすべて**(ログイン、リアルタイム音声を含むAI会話、教材、単語帳、マイページ)を試せます。
- **課金(StoreKit)まで試す**には開発ビルドが必要です: `npx eas-cli@latest build --profile development --platform ios`

## ビルドと提出(EAS)

```bash
npx eas-cli@latest build --profile production --platform ios     # App Store提出用ビルド
npx eas-cli@latest submit --platform ios                          # App Store Connectへアップロード
```

バージョン番号(build number)はEASが自動で採番します(`eas.json` の `appVersionSource: remote` / `autoIncrement`)。

## 開発用コマンド

```bash
npm run typecheck   # TypeScriptの型チェック
npm run lint        # ESLint
npx expo-doctor     # 依存関係・設定の診断(21項目すべて合格する状態を保ってください)
```

- パッケージの追加は必ず `npx expo install <パッケージ名>` で行ってください(SDKに合うバージョンが自動で選ばれます)。`legacy-peer-deps` などで依存関係の警告を隠さないでください。
- `ios/` `android/` フォルダはビルド時に自動生成されるため、Gitには含めません(設定は `app.json` で行います)。

## ディレクトリ構成

```
mobile/
├── app.json / eas.json        # アプリ設定・EASビルド設定
├── assets/                    # アイコン・スプラッシュ・シーン写真(Webサイトと同じ写真)
└── src/
    ├── app/                   # 画面(expo-router のファイルベースルーティング)
    │   ├── (tabs)/            # ホーム / 会話練習 / リスニング / 単語帳 / マイページ
    │   ├── conversation/ history/ materials/ vocabulary/
    │   └── login, pricing, review, terms, privacy, legal
    ├── components/            # UI部品(ui/ は共通パーツ)
    ├── lib/                   # Supabase・API呼び出し・ログイン状態・プラン・課金・リアルタイム音声
    └── theme/                 # 色(Webサイトの「Harbor」デザインと同じ値)
```
