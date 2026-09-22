import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, type AuthSession, type AuthUser } from "@/lib/supabase";

type AuthState = {
  session: AuthSession | null;
  user: AuthUser | null;
  initializing: boolean;
  requestOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitializing(false);
    });

    const { data: listener } = auth.onAuthStateChange((nextSession) => {
      setSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      initializing,
      async requestOtp(email: string) {
        const { error } = await auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true },
        });
        if (error) throw error;
      },
      async verifyOtp(email: string, token: string) {
        const { data, error } = await auth.verifyOtp({
          email,
          token,
          type: "email",
        });
        if (error) throw error;
        if (data.session?.user.email && data.session.user.email !== email) {
          // Guards the same cross-account edge case the web login screen
          // does: never silently continue under the wrong account.
          await auth.signOut();
          throw new Error("email_mismatch");
        }
      },
      async signOut() {
        await auth.signOut();
      },
    }),
    [session, initializing],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
