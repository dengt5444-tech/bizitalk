import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "bizitalk_onboarding_seen";

export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === "true";
  } catch {
    return true; // fail open — never block the app on storage errors
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, "true");
  } catch {
    // ignore
  }
}
