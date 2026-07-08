import { createServerFn } from "@tanstack/react-start";

/**
 * Accepts an "identifier" that may be an email or a mobile number.
 * If it looks like an email, returns it unchanged.
 * Otherwise, looks up the profiles table by phone and returns the linked email
 * so the client can complete signInWithPassword({ email, password }).
 */
export const resolveLoginIdentifier = createServerFn({ method: "POST" })
  .inputValidator((data: { identifier: string }) => {
    if (!data || typeof data.identifier !== "string" || !data.identifier.trim()) {
      throw new Error("Identifier is required");
    }
    return { identifier: data.identifier.trim() };
  })
  .handler(async ({ data }) => {
    const raw = data.identifier;
    if (raw.includes("@")) return { email: raw };

    // Normalize phone: keep digits only, strip leading country code variants
    const digits = raw.replace(/[^0-9]/g, "");
    if (digits.length < 10) throw new Error("Enter a valid email or 10-digit mobile number");
    const last10 = digits.slice(-10);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Try multiple stored formats: "9xxxxxxxxx", "+91 9xxxxxxxxx", "919xxxxxxxxx", etc.
    const candidates = Array.from(
      new Set([
        last10,
        `+91${last10}`,
        `+91 ${last10}`,
        `91${last10}`,
        `0${last10}`,
        digits,
        raw,
      ]),
    );

    const { data: rows, error } = await supabaseAdmin
      .from("profiles")
      .select("email, phone")
      .in("phone", candidates)
      .limit(2);

    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) {
      throw new Error("No account found for that mobile number");
    }
    // If somehow more than one match, prefer an exact-last-10 match
    const match =
      rows.find((r) => (r.phone ?? "").replace(/[^0-9]/g, "").slice(-10) === last10) ?? rows[0];
    if (!match?.email) throw new Error("This mobile number has no email on file");
    return { email: match.email };
  });
