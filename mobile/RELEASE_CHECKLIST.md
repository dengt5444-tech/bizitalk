# App Store(iOS)リリースまでのチェックリスト

アプリのコードは完成していますが、以下はアカウント・支払い・実機での確認など、**運営者ご本人にしかできない作業**です。上から順に進めてください。

## 1. アカウントの準備

- [ ] **Apple Developer Program**(年額 $99)に登録 — https://developer.apple.com/programs/
- [ ] **Expo(EAS)アカウント** — https://expo.dev (`app.json` の `owner: "saddjj"` / `projectId` は以前のアプリから引き継いでいます。別のアカウントを使う場合は `mobile/` で `npx eas-cli@latest init` を実行し直してください)
- [ ] App Store Connect でアプリを新規作成(バンドルID: `com.bizitalk.app`、名前: ビジトーク、主言語: 日本語)

## 2. Webサイト(サーバー)側

アプリはWebサイトのAPIを使うため、**アプリより先にWebサイト側を本番に反映**してください。

- [ ] このブランチの変更(`src/app/api/account/plan/route.ts` の追加。アプリがご登録中のプランを表示するために使います)を本番(Vercel)にデプロイ
- [ ] Vercelの本番環境変数に以下を設定(セクション3で作るプロダクトIDと同じ値)
  - `APPLE_BUNDLE_ID` = `com.bizitalk.app`
  - `APPLE_PRODUCT_ID_TRIAL` / `APPLE_PRODUCT_ID` / `APPLE_PRODUCT_ID_UNLIMITED`
  - (App Store公開後に)`APPLE_APP_APPLE_ID` = App Store ConnectのApple ID(数字)
- [ ] 環境変数を追加・変更したら、Vercelで再デプロイ(再デプロイするまで反映されません)

## 3. App内課金(サブスクリプション)の設定 — App Store Connect

- [ ] 「有料App」契約に同意し、銀行口座・税務情報を登録(App Store Connect >「ビジネス」)。これが済むまで課金はテストもできません
- [ ] 「App内課金」>「サブスクリプション」でサブスクリプショングループを1つ作成(例: ビジトーク AI英会話)
- [ ] グループ内に **3つの自動更新サブスクリプション(期間: 1か月)** を作成
  | プラン | 参照名の例 | プロダクトIDの例 | 価格 |
  | --- | --- | --- | --- |
  | お試しプラン | Trial | `com.bizitalk.app.trial.monthly` | ¥980 |
  | スタンダードプラン | Standard | `com.bizitalk.app.standard.monthly` | ¥4,990 |
  | AI英会話使い放題プラン | Unlimited | `com.bizitalk.app.unlimited.monthly` | ¥9,900 |
  - グループ内の順位は「使い放題 > スタンダード > お試し」の順に(上位プランへの変更がアップグレード扱いになります)
  - 各サブスクリプションに表示名・説明文(日本語)と、審査用スクリーンショット(料金プラン画面)を登録
- [ ] 「App Store サーバー通知」(App情報のページ)の本番URL・サンドボックスURLの両方に `https://<WebサイトのURL>/api/webhooks/apple` を設定(バージョン2)。更新・解約・返金がWebサイトのデータベースに自動で反映されます
- [ ] 「ユーザとアクセス」>「Sandbox」でテスト用Apple IDを作成

## 4. アプリの環境変数(EAS)

`mobile/` で以下を実行し、**production と preview と development** の各環境に登録します(値はすべて公開して問題ないものです)。

```bash
npx eas-cli@latest env:create --environment production --visibility plaintext --name EXPO_PUBLIC_SUPABASE_URL --value "<VercelのNEXT_PUBLIC_SUPABASE_URLと同じ>"
npx eas-cli@latest env:create --environment production --visibility plaintext --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<VercelのNEXT_PUBLIC_SUPABASE_ANON_KEYと同じ>"
npx eas-cli@latest env:create --environment production --visibility plaintext --name EXPO_PUBLIC_API_BASE_URL --value "https://<WebサイトのURL>"
npx eas-cli@latest env:create --environment production --visibility plaintext --name EXPO_PUBLIC_APPLE_PRODUCT_ID_TRIAL --value "<お試しのプロダクトID>"
npx eas-cli@latest env:create --environment production --visibility plaintext --name EXPO_PUBLIC_APPLE_PRODUCT_ID --value "<スタンダードのプロダクトID>"
npx eas-cli@latest env:create --environment production --visibility plaintext --name EXPO_PUBLIC_APPLE_PRODUCT_ID_UNLIMITED --value "<使い放題のプロダクトID>"
```

(`--environment preview` / `--environment development` でも同じものを登録。設定漏れがあると、アプリ起動時に「設定が不足しています」という画面が出るのですぐ気付けます)

## 5. ログインの確認(Webサイトと同じメールアドレスで入れること)

- [ ] Supabaseダッシュボード >「Authentication」>「Email Templates」の **Magic Link** テンプレートに、ログイン用コード `{{ .Token }}` が入っていることを確認(Webサイトの「コードでログイン」と同じものなので、入っているはずです)。アプリはこのコードでログインします
- [ ] **App Store審査用のアカウントを作成**: 審査担当者はメールを受け取れないため、パスワードでログインできるアカウントが必要です。Supabaseダッシュボード >「Authentication」>「Users」>「Add user」>「Create new user」で、審査用のメールアドレスとパスワードを入力し「Auto Confirm User」をオンにして作成してください。アプリのログイン画面の「パスワードでログイン」から入れます
  - 審査で有料機能まで見てもらうには、このメールアドレスをVercelの `ADMIN_EMAILS` に追加しておくと確実です(サブスクリプションなしで全機能が使えます)
- [ ] App Store Connect の「App Reviewに関する情報」>「サインイン情報」に、上記のメールアドレスとパスワードを記入。「メモ」欄に次のように書いておくと親切です:
  > ログイン画面下部の「パスワードでログイン」から、上記のアカウントでログインしてください。AI会話は「会話練習」タブ →任意のシーン →「リアルタイム音声で話し始める」で試せます(マイクを使用します)。

## 6. ビルドして実機で確認

```bash
cd mobile
npx eas-cli@latest build --profile preview --platform ios   # 社内配布用ビルド(実機にインストール可能)
```

確認すること:
- [ ] Webサイトで使っているメールアドレスでログインし、会話の記録・復習リスト・プランがWebサイトと同じ内容で表示される
- [ ] **リアルタイム音声**: マイク許可のダイアログ → AIが最初の一言を話す → こちらが話すと返事をする → AIが話している間に自分の声が拾われない → ミュート・ヒント・終了ボタンが動く → フィードバックが表示される
- [ ] AIの声がスピーカーから十分な音量で聞こえるか(イヤホン・Bluetoothでも確認)
- [ ] テキストモード、フリートーク、ガイド付きモード(ヒント)
- [ ] リスニング教材の再生(マナーモードでも音が出ること)・理解度テスト・復習リストへの保存
- [ ] 単語帳の3モード、復習リストのフラッシュカードと削除
- [ ] ダークモード
- [ ] **課金**(Sandboxのテスト用Apple IDで): 購入 → すぐに「現在ご登録中です」になる → Webサイトのマイページ等でも同じプランになっている → アプリを削除して入れ直し「購入を復元」で戻る → 「サブスクリプションを管理」で解約画面が開く
- [ ] アカウント削除(テスト用アカウントで)

## 7. ストア掲載情報と提出

- [ ] `STORE_LISTING.md` を参考に、説明文・キーワード・スクリーンショット(6.7インチ/6.5インチ)・サポートURL・プライバシーポリシーURL(`https://<WebサイトのURL>/privacy`)を入力
- [ ] 「Appのプライバシー」と年齢制限の質問に回答(`STORE_LISTING.md` に回答の目安あり)
- [ ] 3つのサブスクリプションを、アプリ本体と**同じ審査提出**に含める(アプリのバージョンページの「App内課金およびサブスクリプション」で選択)
- [ ] 本番ビルドを作成して提出:
  ```bash
  npx eas-cli@latest build --profile production --platform ios
  npx eas-cli@latest submit --platform ios
  ```

## 8. 審査でリジェクトされたら

理由の文面をそのまま共有してください。対応します。
