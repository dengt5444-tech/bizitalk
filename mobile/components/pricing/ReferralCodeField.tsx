import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { getStoredReferralCode, setStoredReferralCode } from "@/lib/referral";

export function ReferralCodeField({ onChange }: { onChange: (code: string) => void }) {
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
    <View style={{ gap: 6, maxWidth: 260, alignSelf: "center", width: "100%" }}>
      <Text size={12} weight="medium" color="inkSoft" style={{ textAlign: "center" }}>
        紹介コード(お持ちの方のみ)
      </Text>
      <Input
        value={code}
        onChangeText={handleChange}
        placeholder="例: AB12CD34"
        autoCapitalize="characters"
        style={{ textAlign: "center", letterSpacing: 2 }}
      />
    </View>
  );
}
