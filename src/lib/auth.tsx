import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "customer";

type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  customerId: string | null;
  profile: { full_name: string | null; phone: string | null; email: string | null } | null;
  approvalStatus: "pending" | "approved" | "rejected" | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [profile, setProfile] = useState<AuthState["profile"]>(null);
  const [approvalStatus, setApprovalStatus] = useState<AuthState["approvalStatus"]>(null);
  const [loading, setLoading] = useState(true);
  const profileRequest = useRef(0);

  async function loadProfile(uid: string) {
    const requestId = ++profileRequest.current;
    const [{ data: roleRow, error: roleError }, { data: prof, error: profileError }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
      supabase.from("profiles").select("full_name, phone, email, customer_id").eq("id", uid).maybeSingle(),
    ]);
    if (roleError || profileError) {
      throw roleError ?? profileError;
    }
    if (requestId !== profileRequest.current) return;

    const resolvedRole = roleRow?.role;
    setRole(resolvedRole === "admin" || resolvedRole === "customer" ? resolvedRole : null);
    setCustomerId(prof?.customer_id ?? null);
    setProfile(
      prof
        ? { full_name: prof.full_name, phone: prof.phone, email: prof.email }
        : null,
    );
    if (prof?.customer_id) {
      const { data: cust } = await supabase
        .from("customers")
        .select("approval_status")
        .eq("id", prof.customer_id)
        .maybeSingle();
      setApprovalStatus((cust?.approval_status as AuthState["approvalStatus"]) ?? null);
    } else {
      setApprovalStatus(null);
    }
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        // defer to avoid deadlock per supabase guidance
        setLoading(true);
        setTimeout(async () => {
          try {
            await loadProfile(s.user.id);
          } catch (error) {
            console.error("Unable to load account access", error);
            setRole(null);
          } finally {
            setLoading(false);
          }
        }, 0);
      } else {
        profileRequest.current += 1;
        setRole(null);
        setCustomerId(null);
        setProfile(null);
        setApprovalStatus(null);
        setLoading(false);
      }
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      try {
        if (data.session?.user) await loadProfile(data.session.user.id);
      } catch (error) {
        console.error("Unable to load account access", error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = async () => {
    if (session?.user) {
      setLoading(true);
      try {
        await loadProfile(session.user.id);
      } finally {
        setLoading(false);
      }
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider
      value={{
        loading,
        session,
        user: session?.user ?? null,
        role,
        customerId,
        profile,
        approvalStatus,
        refresh,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
}
