import * as WebBrowser from "expo-web-browser";
import { api } from "./api";

export type CheckoutPlan = "listening" | "trial" | "standard" | "unlimited";

// Stripe redirects to this custom scheme (see MOBILE_RETURN_SCHEME in
// ../src/app/api/checkout/route.ts) once checkout finishes; openAuthSessionAsync
// watches for it and auto-closes the in-app browser.
export async function startCheckout(plan: CheckoutPlan, referralCode?: string) {
  const { url } = await api.post<{ url: string }>("/api/checkout", {
    plan,
    referralCode,
    mobileReturn: true,
  });
  return WebBrowser.openAuthSessionAsync(url, "bizitalk://checkout");
}

export async function openBillingPortal(plan: "conversation" | "listening") {
  const { url } = await api.post<{ url: string }>("/api/portal", { plan, mobileReturn: true });
  return WebBrowser.openAuthSessionAsync(url, "bizitalk://portal-return");
}
