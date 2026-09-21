import { Tag } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { getStoredReferralCode, setStoredReferralCode } from "@/lib/referral";
import { useTheme } from "@/theme/ThemeProvider";

export function ReferralCodeField({ onChange }: { onChange: (code: string) => void }) {
  const theme = useTheme();
  const [code, setCode] = useState("");

  useEffect(() => {
    getStoredReferralCode().then((stored) => {
      setCode(stored);
      onChange(stored);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(value: string) {
    const upper = value.toUpperCase();
    setCode(upper);
    onChange(upper);
    setStoredReferralCode(upper);
  }

  return (
    <Card style={{ gap: 4, maxWidth: 320, alignSelf: "center", width: "100%", paddingVertical: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <Tag size={15} color={theme.colors.signal} strokeWidth={2} />
        <Text size={14} weight="semibold" style={{ textAlign: "center" }}>
          紹介コードをお持ちですか?
        </Text>
      </View>
      <Text size={12} color="inkSoft" style={{ textAlign: "center" }}>
        インフルエンサーやパートナーからコードをもらった方は、こちらに入力してください。なくても登録できます。
      </Text>
      <Input
        value={code}
        onChangeText={handleChange}
        placeholder="例: AB12CD34"
        autoCapitalize="characters"
        style={{ textAlign: "center", letterSpacing: 2, marginTop: 8 }}
      />
    </Card>
  );
}
