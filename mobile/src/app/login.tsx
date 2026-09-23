import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Button, Card, Text } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { radius, useColors } from "@/theme";

type Step = "email" | "code" | "password";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function friendlyError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("rate limit") || lower.includes("security purposes")) {
    return "短時間に何度も送信されました。少し時間をおいてから、もう一度お試しください。";
  }
  if (lower.includes("invalid login credentials")) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }
  if (lower.includes("expired") || lower.includes("invalid")) {
    return "コードが正しくないか、期限切れです。メールを確認するか、コードを送り直してください。";
  }
  if (lower.includes("network")) {
    return "通信に失敗しました。インターネット接続をご確認ください。";
  }
  return message;
}

// Same Supabase Auth (same project, same users) as the web app's /login:
// the email address a learner uses on the website logs in to exactly the
// same account here, with the same history, saved words and plan.
//
// The website's login email contains both a magic link and a one-time
// code. A magic link can't hand a session to a native app without extra
// deep-link setup, so the app uses the code — and never changes the link,
// which still logs in to the website as before if tapped.
export default function LoginScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedEmail = email.trim().toLowerCase();

  async function signOutIfDifferentAccount() {
    // Switching accounts: never leave the old session active behind the new
    // one, or it could look like the new email "didn't work".
    if (user?.email && user.email.toLowerCase() !== normalizedEmail) {
      await supabase.auth.signOut();
    }
  }

  async function sendCode() {
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError("メールアドレスの形式が正しくありません。");
      return;
    }
    setBusy(true);
    setError(null);
    await signOutIfDifferentAccount();
    const { error: sendError } = await supabase.auth.signInWithOtp({ email: normalizedEmail });
    setBusy(false);
    if (sendError) {
      setError(friendlyError(sendError.message));
      return;
    }
    setCode("");
    setStep("code");
  }

  function finish(resultEmail: string | undefined) {
    // Safety net: the session must be for the email just verified.
    if (resultEmail && resultEmail.toLowerCase() !== normalizedEmail) {
      supabase.auth.signOut();
      setError("認証したメールアドレスが一致しませんでした。お手数ですがもう一度お試しください。");
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  async function verifyCode() {
    setBusy(true);
    setError(null);
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: code.trim(),
      type: "email",
    });
    setBusy(false);
    if (verifyError) {
      setError(friendlyError(verifyError.message));
      return;
    }
    finish(data.user?.email);
  }

  async function signInWithPassword() {
    setBusy(true);
    setError(null);
    await signOutIfDifferentAccount();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    setBusy(false);
    if (signInError) {
      setError(friendlyError(signInError.message));
      return;
    }
    finish(data.user?.email);
  }

  const inputStyle = [styles.input, { borderColor: colors.line, backgroundColor: colors.paper, color: colors.ink }];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.paper }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: 14 }}>
          <Text variant="title">ログイン</Text>

          {user?.email && step === "email" && (
            <View style={[styles.notice, { backgroundColor: colors.paperDim, borderColor: colors.line }]}>
              <Text variant="small">
                現在 <Text variant="small" tone="ink" weight="600">{user.email}</Text>{" "}
                としてログイン中です。別のメールアドレスを入力すると、現在のセッションからログアウトしてから切り替えます。
              </Text>
            </View>
          )}

          {step === "code" ? (
            <>
              <View style={[styles.notice, { backgroundColor: colors.signalTint, borderColor: colors.signalTint }]}>
                <Text variant="small" tone="signalDim">
                  {normalizedEmail} 宛にメールを送信しました。メールに記載されている数字のコードを入力してください。
                </Text>
              </View>
              <Text variant="caption">
                ※ Webサイトと同じメールが届きます。メール内のリンクはWebサイト用のため、アプリではコードをご利用ください。
              </Text>
              <TextInput
                value={code}
                onChangeText={(value) => setCode(value.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                autoFocus
                maxLength={10}
                placeholder="123456"
                placeholderTextColor={colors.inkFaint}
                accessibilityLabel="コード"
                style={[...inputStyle, styles.codeInput]}
              />
              {error && (
                <Text variant="small" tone="rose">
                  {error}
                </Text>
              )}
              <Button title="コードでログイン" loading={busy} disabled={code.trim().length < 6} onPress={verifyCode} />
              <Button title="コードを再送信する" variant="ghost" disabled={busy} onPress={sendCode} />
              <Button
                title="別のメールアドレスで送り直す"
                variant="ghost"
                onPress={() => {
                  setStep("email");
                  setError(null);
                }}
              />
            </>
          ) : (
            <>
              <Text variant="small">
                {step === "password"
                  ? "パスワードを設定済みのアカウントでログインします。"
                  : "Webサイトと同じメールアドレスを入力してください。ログイン用のコードをメールでお送りします。はじめての方も、そのまま登録できます。"}
              </Text>
              <View style={{ gap: 6 }}>
                <Text variant="caption" tone="ink" weight="600">
                  メールアドレス
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.inkFaint}
                  accessibilityLabel="メールアドレス"
                  returnKeyType={step === "password" ? "next" : "send"}
                  onSubmitEditing={step === "email" ? sendCode : undefined}
                  style={inputStyle}
                />
              </View>
              {step === "password" && (
                <View style={{ gap: 6 }}>
                  <Text variant="caption" tone="ink" weight="600">
                    パスワード
                  </Text>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    textContentType="password"
                    autoComplete="current-password"
                    autoCapitalize="none"
                    accessibilityLabel="パスワード"
                    returnKeyType="go"
                    onSubmitEditing={signInWithPassword}
                    style={inputStyle}
                  />
                </View>
              )}
              {error && (
                <Text variant="small" tone="rose">
                  {error}
                </Text>
              )}
              {step === "password" ? (
                <>
                  <Button
                    title="ログイン"
                    loading={busy}
                    disabled={!normalizedEmail || !password}
                    onPress={signInWithPassword}
                  />
                  <Button
                    title="メールのコードでログインする"
                    variant="ghost"
                    onPress={() => {
                      setStep("email");
                      setError(null);
                    }}
                  />
                </>
              ) : (
                <>
                  <Button title="ログインコードを送信" loading={busy} disabled={!normalizedEmail} onPress={sendCode} />
                  <Button
                    title="パスワードでログイン"
                    variant="ghost"
                    size="sm"
                    onPress={() => {
                      setStep("password");
                      setError(null);
                    }}
                  />
                </>
              )}
            </>
          )}
        </Card>
        <Text variant="caption" center>
          ログインすることで、利用規約およびプライバシーポリシーに同意したものとみなされます。
        </Text>
        <View style={styles.links}>
          <Button title="利用規約" variant="ghost" size="sm" onPress={() => router.push("/terms")} />
          <Button title="プライバシーポリシー" variant="ghost" size="sm" onPress={() => router.push("/privacy")} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14, paddingBottom: 60 },
  notice: { borderRadius: 14, borderWidth: 1, padding: 14 },
  input: { height: 48, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 16 },
  codeInput: { textAlign: "center", fontSize: 22, letterSpacing: 6, height: 56 },
  links: { flexDirection: "row", justifyContent: "center" },
});
