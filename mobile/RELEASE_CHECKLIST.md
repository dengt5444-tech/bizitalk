# リリースに向けてユーザー側で必要な作業

アプリのコードは実装済みですが、以下はアカウント開設・支払い・実機での最終確認など、**ユーザー(運営者)本人にしかできない作業**です。上から順番に進めることを想定しています。

## 1. アカウントの準備

- [ ] **Apple Developer Program**(年額 $99)に登録 — https://developer.apple.com/programs/
- [ ] **Google Play Console**(初回 $25、一度きり)に登録 — https://play.google.com/console/
- [ ] **Expo/EAS アカウント**(無料枠でOK)を作成 — https://expo.dev/signup
  - `mobile/` で `npm install -g eas-cli && eas login && eas init` を実行(`eas init` で `app.json` に `extra.eas.projectId` が自動追記されます)

## 2. バックエンド・環境変数の最終確認

- [ ] Web版(Next.js)を本番ドメインにデプロイ済みであることを確認(Vercel推奨)。モバイルアプリはこのURLを `EXPO_PUBLIC_API_BASE_URL` として使います。
- [ ] `mobile/.env`(本番ビルド用)に、本番の `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` / `EXPO_PUBLIC_API_BASE_URL` を設定
- [ ] (任意)`EXPO_PUBLIC_STRIPE_PRICE_ID*` を設定すると、マイページの「現在ご登録中のプラン」表示がAI会話の3プランを正しく区別できるようになります(未設定でも決済・利用制限自体は正常に動作します)
- [ ] Web版の `STRIPE_WEBHOOK_SECRET` など、既存の環境変数一式が本番Vercelプロジェクトに設定済みであることを確認
- [ ] iOS課金(StoreKit)用に、Web版の本番環境変数へ `APPLE_BUNDLE_ID`(`com.bizitalk.app`)と `APPLE_PRODUCT_ID_LISTENING` / `APPLE_PRODUCT_ID_TRIAL` / `APPLE_PRODUCT_ID` / `APPLE_PRODUCT_ID_UNLIMITED` を追加(下記セクション3で作成する商品IDと一致させる)。`mobile/.env` にも同じ値を `EXPO_PUBLIC_APPLE_PRODUCT_ID_*` として設定(詳細は `.env.example` / `mobile/.env.example` を参照)

## 3. iOS課金(StoreKit)のApp Store Connect設定

iOS版アプリはStoreKit(App内課金)による購入フローを実装済みです(`expo-iap` + Apple公式ライブラリ `@apple/app-store-server-library` によるサーバー側の署名検証、`mobile/components/pricing/PricingPlans.tsx`)。Android版は引き続きStripe Checkoutです(ストアがWeb決済を許可しています)。**コード側の作業は完了しているため、以下はApp Store Connect上の設定作業のみです。**

- [ ] App Store Connect > 該当アプリ > 機能 > App内課金 で、**自動更新サブスクリプション**のサブスクリプショングループを1つ作成
- [ ] グループ内に、既存のStripeプランと対応する **4つの商品** を作成し、上記セクション2で設定した `APPLE_PRODUCT_ID_*` と完全に一致するプロダクトIDを付ける
  - リスニングプラン / お試しプラン / スタンダードプラン / AI英会話使い放題プラン
  - 各商品の価格(ティア)・表示名・説明文を、`mobile/components/pricing/PricingPlans.tsx` の `PLANS` に定義された価格に合わせて設定(Appleの価格ティアは日本円の任意の額を選べるとは限らないため、一番近いティアを選んでください)
- [ ] 各商品を「送信準備完了」状態にする(App本体の審査提出前に商品自体の審査も必要です)
- [ ] App Store Connect > 該当アプリ > 一般 > App情報 > App Store Server通知 で、**本番URL・サンドボックスURLの両方**に `https://<本番ドメイン>/api/webhooks/apple` を設定(バージョンは Version 2)。これにより更新・解約・返金・支払い失敗などの通知が自動でSupabaseに反映されます
- [ ] Sandboxテスター用のApple IDを1つ作成(App Store Connect > ユーザとアクセス > Sandboxテスター)し、実機(セクション6)でこのアカウントを使って購入・復元の一連の流れをテスト

補足: レシート共有シークレット(旧App内課金APIのshared secret)は**不要**です。このアプリはStoreKit 2のJWS署名検証をApple公式ライブラリで行っており、Appleのルート証明書のみで完結する設計のためです。

## 4. アプリの基本情報の最終確認

- [ ] `mobile/app.json` の `ios.bundleIdentifier` / `android.package`(`com.bizitalk.app`)が、他の誰にも使われていない・今後変更しない前提で問題ないか確認(一度ストアに登録すると変更が困難です)
- [ ] アプリ名「ビジトーク」がストアでの検索・商標上問題ないか確認(特に英語表記 "BizTalk" は Microsoft BizTalk Server という既存製品と同名なため、必要であれば表記を工夫してください。日本語の「ビジトーク」単体では大きな問題は想定していません)
- [ ] `mobile/lib/site.ts` の運営者情報・サポートメール、`mobile/app/legal.tsx` の特定商取引法表記(販売事業者名など)が現在も正しいか再確認

## 5. Supabase RLS(行レベルセキュリティ)の再確認

モバイルアプリは一部のテーブル(`gakuto_materials`・`vocab_decks`・`conversation_scenarios` など)にSupabaseへ直接アクセスします。実装にあたって「これらは誰でも読める(`using (true)`)公開テーブルである」「`subscriptions`・`saved_words` などは本人の行のみアクセス可能」という前提で組んでいますが、これは今回のコード調査時点の推測に基づくものです。

- [ ] Supabaseダッシュボードの Authentication > Policies で、上記の前提が実際のRLS設定と一致しているか確認してください。仮に本人以外の行も読めるような緩い設定になっていた場合、モバイル・Web問わず情報漏えいのリスクがあるため、この機会に見直すことをおすすめします。

## 6. 実機での最終確認(このクラウド環境ではできない作業)

このセッションにはXcode/Android Studio、実機・シミュレータが無いため、以下は必ずユーザー側の環境で確認してください。

- [ ] `npm run build:preview:ios` / `npm run build:preview:android` でビルドし、実機にインストールして一通り操作
- [ ] **リアルタイム音声通話**(このアプリで最も複雑な機能)が実機で問題なく動作するか(マイク許可・音声の聞こえ方・通話品質)を重点的に確認
- [ ] ダークモード表示の確認
- [ ] 決済(Stripe Checkout、Android/Web)が実際に完了しアプリに戻ってくるか確認
- [ ] **iOSのStoreKit購入**を、セクション3で作成したSandboxテスターでテスト:新規購入 → マイページの表示が即座に「現在ご登録中です」に切り替わるか → 一度アンインストールして再インストールし「購入を復元」で復元されるか
- [ ] アカウント削除が実際にSupabase側のデータ・Stripeサブスクリプション・Apple側のエンタイトルメントを削除しているか確認

## 7. ストア掲載情報の入力・提出

- [ ] `mobile/STORE_LISTING.md` の内容を参考に、App Store Connect / Google Play Console の商品ページを作成
- [ ] 実機のスクリーンショットを撮影して登録(`STORE_LISTING.md` に必要な画面のリストがあります)
- [ ] Appのプライバシー(Apple)/ データセーフティ(Google)フォームに入力
- [ ] 年齢制限アンケートに回答
- [ ] `npm run submit:ios` / `npm run submit:android`、または各コンソールから提出

## 8. 審査後の対応

- [ ] Apple/Googleの審査でリジェクトされた場合、理由を確認の上、私に共有していただければ対応します(StoreKit商品がセクション3の設定通りに審査提出されているか、App内課金の商品審査状況が最も見落としやすいポイントです)
