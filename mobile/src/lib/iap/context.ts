import { createContext, useContext } from "react";
import type { ConversationPlan } from "../plan";

export type StoreProduct = { plan: ConversationPlan; productId: string; displayPrice: string };

export type IapState = {
  // False in Expo Go / on Android / when no product IDs are configured —
  // the pricing screen then uses the non-StoreKit path.
  available: boolean;
  connected: boolean;
  products: Partial<Record<ConversationPlan, StoreProduct>>;
  purchasingPlan: ConversationPlan | null;
  restoring: boolean;
  purchase: (plan: ConversationPlan) => Promise<void>;
  restore: () => Promise<number>;
  manageSubscriptions: () => Promise<void>;
};

export const unavailableIap: IapState = {
  available: false,
  connected: false,
  products: {},
  purchasingPlan: null,
  restoring: false,
  purchase: async () => {},
  restore: async () => 0,
  manageSubscriptions: async () => {},
};

export const IapContext = createContext<IapState>(unavailableIap);

export function useIap() {
  return useContext(IapContext);
}
