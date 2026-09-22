import { useRouter } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ScreenScroll } from "@/components/ui/ScreenContainer";
import { Heading, Text } from "@/components/ui/Text";
import { useAuth } from "@/context/AuthProvider";
import { useTheme } from "@/theme/ThemeProvider";

// TEMPORARY diagnostic — shows exactly what got embedded into this build at
// bundle time, to tell a real missing/wrong-value bug apart from anything
// else. Remove once the login issue is confirmed fixed.
function EnvDebugBox() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const api = process.env.EXPO_PUBLIC_API_BASE_URL;
  const describe = (v: string | undefined) =>
    v === undefined ? "未定義(undefined)" : v === "" ? "空文字" : `"${v}"`;
  return (
    <View style={{ borderWidth: 1, borderColor: "red", padding: 10, gap: 4 }}>
      <Text size={11} color="rose">
        [DEBUG] URL: {describe(url)}
      </Text>
      <Text size={11} color="rose">
        [DEBUG] API: {describe(api)}
      </Text>
      <Text size={11} color="rose">
        [DEBUG] KEY length: {key ? key.length : describe(key)}
        {key ? ` / 先頭: ${key.slice(0, 8)} / 末尾: ${key.slice(-8)}` : ""}
      </Text>
    </View>
  );
}

type Stage = "email" | "sent";

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { requestOtp, verifyOtp } = useAuth();

  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    if (!email.trim()) return;
    setSending(true);
    setError("");
    try {
      await requestOtp(email.trim());
      setStage("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "送信に失敗しました。");
    } finally {
      setSending(false);
    }
  }

  async function handleVerify() {
    if (!code.trim()) return;
    setVerifying(true);
    setError("");
    try {
      await verifyOtp(email.trim(), code.trim());
      router.replace("/(tabs)");
    } catch (err) {
      setError(
        err instanceof Error && err.message === "email_mismatch"
          ? "認証したメールアドレスが一致しませんでした。もう一度お試しください。"
          : "コードが正しくないか、期限切れです。",
      );
    } finally {
      setVerifying(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenScroll contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
        <Card style={{ gap: 16 }}>
          <View>
            <Heading level={2}>ログイン</Heading>
            <Text color="inkSoft" style={{ marginTop: 6 }}>
              メールアドレスを入力すると、6桁のログインコードをお送りします。
            </Text>
          </View>

          <EnvDebugBox />

          {stage === "email" ? (
            <View style={{ gap: 12 }}>
              <View style={{ gap: 6 }}>
                <Text weight="medium" size={13}>
                  メールアドレス
                </Text>
                <Input
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                />
              </View>

              {!!error && (
                <Text color="rose" size={13}>
                  {error}
                </Text>
              )}

              <Button
                label={sending ? "送信中..." : "ログインコードを送信"}
                onPress={handleSend}
                loading={sending}
                disabled={!email.trim()}
                fullWidth
              />
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <View
                style={{
                  borderRadius: theme.radius.sm,
                  borderWidth: 1,
                  borderColor: theme.colors.signal,
                  backgroundColor: theme.colors.signalTint,
                  padding: 14,
                }}
              >
                <Text size={13} color="signalDim">
                  {email} 宛にメールを送信しました。メールに記載された6桁のコードを入力してください。
                </Text>
              </View>

              <View style={{ gap: 6 }}>
                <Text weight="medium" size={13}>
                  6桁のコード
                </Text>
                <Input
                  value={code}
                  onChangeText={setCode}
                  placeholder="123456"
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  maxLength={6}
                  style={{ textAlign: "center", fontSize: 20, letterSpacing: 6 }}
                />
              </View>

              {!!error && (
                <Text color="rose" size={13}>
                  {error}
                </Text>
              )}

              <Button
                label={verifying ? "確認中..." : "コードでログイン"}
                onPress={handleVerify}
                loading={verifying}
                disabled={!code.trim()}
                fullWidth
              />

              <Button
                label="別のメールアドレスで送り直す"
                variant="ghost"
                onPress={() => {
                  setStage("email");
                  setCode("");
                  setError("");
                }}
                fullWidth
              />
            </View>
          )}
        </Card>

        <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 16 }}>
          <Text size={12} color="inkFaint" onPress={() => router.push("/terms")}>
            利用規約
          </Text>
          <Text size={12} color="inkFaint">
            ・
          </Text>
          <Text size={12} color="inkFaint" onPress={() => router.push("/privacy")}>
            プライバシーポリシー
          </Text>
        </View>
      </ScreenScroll>
    </KeyboardAvoidingView>
  );
}
