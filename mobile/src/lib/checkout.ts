import * as WebBrowser from "expo-web-browser";
import { api } from "./api";
import type { ConversationPlan } from "./plan";

// Android only: Google Play allows web payment for this kind of service in
// Japan, so Android keeps the web app's Stripe checkout (opened in an
// in-app browser that returns to the app via the bizitalk:// scheme). iOS
// always uses StoreKit instead — see lib/iap.
export async function openStripeCheckout(plan: ConversationPlan, referralCode: string) {
  const { url } = await api.post<{ url: string }>("/api/checkout", { plan, referralCode, mobileReturn: true });
  const result = await WebBrowser.openAuthSessionAsync(url, "bizitalk://checkout");
  return result.type === "success" && result.url.includes("status=success");
}

export async function openStripePortal() {
  const { url } = await api.post<{ url: string }>("/api/portal", { plan: "conversation", mobileReturn: true });
  await WebBrowser.openAuthSessionAsync(url, "bizitalk://portal-return");
}
