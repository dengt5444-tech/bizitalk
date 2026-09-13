import AsyncStorage from "@react-native-async-storage/async-storage";

export const REFERRAL_CODE_STORAGE_KEY = "biztalk_referral_code";

export async function getStoredReferralCode(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(REFERRAL_CODE_STORAGE_KEY)) ?? "";
  } catch {
    return "";
  }
}

export async function setStoredReferralCode(code: string) {
  try {
    if (code) {
      await AsyncStorage.setItem(REFERRAL_CODE_STORAGE_KEY, code);
    } else {
      await AsyncStorage.removeItem(REFERRAL_CODE_STORAGE_KEY);
    }
  } catch {
    // Ignore — the code still works for this checkout, it just won't be
    // remembered next time.
  }
}
