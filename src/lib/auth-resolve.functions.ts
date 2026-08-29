import { createServerFn } from "@tanstack/react-start";

/**
 * Sign in with either an email or a mobile number + password.
 *
 * SECURITY: This endpoint never returns the account's email or any account
 * metadata for a lookup-only call. Password verification happens server-side
 * against Supabase Auth, and only on success are session tokens returned.
 * On any failure (unknown phone, wrong password, no email on file) the same
 * generic "Invalid credentials" error is returned to prevent account
 * enumeration and PII harvesting via phone-to-email lookup.
 */
export const signInWithIdentifier = createServerFn({ method: "POST" })
  .inputValidator((data: { identifier: string; password: string }) => {
    if (!data || typeof data.identifier !== "string" || !data.identifier.trim()) {
      throw new Error("Invalid credentials");
    }
    if (typeof data.password !== "string" || data.password.length === 0) {
      throw new Error("Invalid credentials");
    }
    return { identifier: data.identifier.trim(), password: data.password };
  })
  .handler(async ({ data }) => {
    const GENERIC = "Invalid credentials";
    const raw = data.identifier;

    let email: string | null = null;

    if (raw.includes("@")) {
      email = raw;
    } else {
      const digits = raw.replace(/[^0-9]/g, "");
      if (digits.length < 10) throw new Error(GENERIC);
      const last10 = digits.slice(-10);

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const candidates = Array.from(
        new Set([last10, `+91${last10}`, `+91 ${last10}`, `91${last10}`, `0${last10}`, digits, raw]),
      );

      const { data: rows, error } = await supabaseAdmin
        .from("profiles")
        .select("email, phone")
        .in("phone", candidates)
        .limit(2);

      if (error || !rows || rows.length === 0) throw new Error(GENERIC);

      const match =
        rows.find((r) => (r.phone ?? "").replace(/[^0-9]/g, "").slice(-10) === last10) ?? rows[0];
      if (!match?.email) throw new Error(GENERIC);
      email = match.email;
    }

    // Verify the password server-side with a publishable-key client (RLS applies,
    // no session persistence). Only on success do we return session tokens.
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.SUPABASE_URL;
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !publishableKey) throw new Error(GENERIC);

    const authClient = createClient(
      supabaseUrl,
      publishableKey,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
      email,
      password: data.password,
    });

    if (signInError || !signInData.session) throw new Error(GENERIC);

    return {
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
    };
  });
