import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";
import { useAuth } from "./auth";

export type ConversationPlan = "trial" | "standard" | "unlimited";
export type PlanInfo = { plan: ConversationPlan | "admin" | null; source: "stripe" | "apple_iap" | null };

type PlanState = PlanInfo & { refresh: () => Promise<void> };

const NO_PLAN: PlanInfo = { plan: null, source: null };
const PlanContext = createContext<PlanState | null>(null);

// The signed-in user's current AI conversation plan, resolved by the web
// backend with the very same rules the website uses (see
// ../../../src/app/api/account/plan/route.ts).
export function PlanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  // Tagged with the user it was fetched for, so signing out (or switching
  // accounts) can never show the previous account's plan.
  const [state, setState] = useState<{ userId: string | null; info: PlanInfo }>({ userId: null, info: NO_PLAN });

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const info = await api.get<PlanInfo>("/api/account/plan");
      setState({ userId, info });
    } catch {
      // Keep whatever was shown before; screens can pull to refresh.
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    api
      .get<PlanInfo>("/api/account/plan")
      .then((info) => {
        if (!cancelled) setState({ userId, info });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const info = userId && state.userId === userId ? state.info : NO_PLAN;
  const value = useMemo(() => ({ ...info, refresh }), [info, refresh]);
  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used inside PlanProvider");
  return ctx;
}

export const PLAN_LABELS: Record<ConversationPlan | "admin", string> = {
  trial: "お試しプラン",
  standard: "スタンダードプラン",
  unlimited: "AI英会話使い放題プラン",
  admin: "管理者アカウント",
};
