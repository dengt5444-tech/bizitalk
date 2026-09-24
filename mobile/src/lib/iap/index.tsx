import Constants, { ExecutionEnvironment } from "expo-constants";
import type { ReactNode } from "react";
import { Platform } from "react-native";

// StoreKit is only reachable from a real iOS build: Expo Go doesn't contain
// the expo-iap native module, and Android uses Stripe instead. In those
// cases the provider module is never even evaluated, so the rest of the app
// (everything except buying) still runs in Expo Go for quick testing.
const storeKitAvailable =
  Platform.OS === "ios" && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

export function PurchaseProvider({ children }: { children: ReactNode }) {
  if (!storeKitAvailable) return <>{children}</>;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- deliberately lazy, see above
  const { IapProvider } = require("./IapProvider") as typeof import("./IapProvider");
  return <IapProvider>{children}</IapProvider>;
}
