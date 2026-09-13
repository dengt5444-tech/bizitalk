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
- [ ] Web版の `STRIPE_WEBHOOK_SECRET` など、既存の環境変数一式が本番Vercelプロジェクトに設定済みであることを確認(モバイル対応で新しい環境変数は増えていません)

## 3. iOSの課金方法を決める(重要な意思決定)

AppleはApp内で消費するデジタルサブスクリプションに原則 **StoreKit(App内課金)** を義務付けています。このAI会話サービスは「リーダーアプリ」の例外に該当しないと考えられるため、現状のコードでは **iOS版は新規プランの決済ボタン・外部決済へのリンクを一切表示しない**(Web版でのみ登録できる)という保守的な対応にしてあります(`mobile/components/pricing/PricingPlans.tsx`)。既存プランの「解約・お支払い方法の変更」は、既存の外部サブスクリプションを管理するだけなのでiOSでも許可されており、そのまま動作します。

このまま提出する場合の影響: **iOSアプリだけでは新規課金ができません**(Android版と、Web版からの登録は可能)。ユーザー体験・売上への影響を踏まえて、以下のいずれかを選んでください。

- [ ] **(A) 現状維持**: iOSは「すでにWeb/Androidで契約した人が使うアプリ」と位置づける。追加実装は不要ですが、iOS単体での新規課金ができないため機会損失があります。
- [ ] **(B) StoreKit(App内課金)を実装する**: Apple税(通常15〜30%)がかかりますが、iOS単体で新規課金が可能になります。App Store Connect でサブスクリプション商品を作成した後、`react-native-iap` または [RevenueCat](https://www.revenuecat.com/)(レシート検証・Webhookでのエンタイトルメント同期を代行してくれるサービスで、個人開発〜小規模チームでの採用実績が多い)を使った実装が必要です。App Store Connect のアカウントと商品設定が前提になるため、この作業はユーザー側でアカウント準備後、私(Claude)に続きを依頼していただければ実装します。
- [ ] **(C) Androidのみ先にリリースし、iOSは(B)の実装後に提出する**

いずれを選ぶ場合も、審査に出す前に一度この方針を確認してください。

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
- [ ] アカウント削除が実際にSupabase側のデータ・Stripeサブスクリプションを削除しているか確認

## 7. ストア掲載情報の入力・提出

- [ ] `mobile/STORE_LISTING.md` の内容を参考に、App Store Connect / Google Play Console の商品ページを作成
- [ ] 実機のスクリーンショットを撮影して登録(`STORE_LISTING.md` に必要な画面のリストがあります)
- [ ] Appのプライバシー(Apple)/ データセーフティ(Google)フォームに入力
- [ ] 年齢制限アンケートに回答
- [ ] `npm run submit:ios` / `npm run submit:android`、または各コンソールから提出

## 8. 審査後の対応

- [ ] Apple/Googleの審査でリジェクトされた場合、理由を確認の上、私に共有していただければ対応します(特に3番の課金方針に関する指摘が最も可能性が高いです)
