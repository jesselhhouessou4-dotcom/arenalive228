import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = {
  user: User | null;
  roles: string[];
  loading: boolean;
  isAdmin: boolean;
  isScorer: boolean;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  roles: [],
  loading: true,
  isAdmin: false,
  isScorer: false,
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(u: User | null) {
    setUser(u);
    if (u) {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.id);
      setRoles((data ?? []).map((r) => r.role));
    } else setRoles([]);
    setLoading(false);
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setTimeout(() => load(session?.user ?? null), 0);
      }
    });
    supabase.auth.getUser().then(({ data }) => load(data.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        loading,
        isAdmin: roles.includes("admin"),
        isScorer: roles.includes("marqueur"),
        refresh: async () => {
          const { data } = await supabase.auth.getUser();
          await load(data.user ?? null);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
