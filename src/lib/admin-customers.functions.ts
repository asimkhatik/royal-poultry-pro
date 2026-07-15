import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteCustomerCompletely = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { customerId: string; reason?: string }) => {
    if (!input?.customerId || typeof input.customerId !== "string") {
      throw new Error("customerId required");
    }
    return { customerId: input.customerId, reason: input.reason?.slice(0, 500) ?? null };
  })
  .handler(async ({ data, context }) => {
    // Verify admin
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr || !isAdmin) throw new Error("Forbidden: admin only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch customer + admin profile for logging
    const [{ data: customer }, { data: adminProfile }] = await Promise.all([
      supabaseAdmin.from("customers").select("id, name, user_id").eq("id", data.customerId).maybeSingle(),
      supabaseAdmin.from("profiles").select("full_name, email").eq("id", context.userId).maybeSingle(),
    ]);
    if (!customer) throw new Error("Customer not found");

    const customerUserId = customer.user_id as string | null;

    // Prevent an admin from deleting their own account
    if (customerUserId && customerUserId === context.userId) {
      throw new Error("Cannot delete your own account");
    }

    // Explicitly clear all linked records (in addition to FK cascades)
    await supabaseAdmin.from("reminder_logs").delete().eq("customer_id", data.customerId);
    await supabaseAdmin.from("payments").delete().eq("customer_id", data.customerId);
    await supabaseAdmin.from("sales").delete().eq("customer_id", data.customerId);
    await supabaseAdmin.from("customers").delete().eq("id", data.customerId);

    // Delete linked auth user + profile
    if (customerUserId) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", customerUserId);
      await supabaseAdmin.from("profiles").delete().eq("id", customerUserId);
      const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(customerUserId);
      if (authErr) console.error("[deleteCustomer] auth delete failed:", authErr.message);
    }

    // Activity log
    await supabaseAdmin.from("admin_activity_log").insert({
      admin_id: context.userId,
      admin_name: adminProfile?.full_name || adminProfile?.email || null,
      action: "delete_customer",
      target_type: "customer",
      target_id: data.customerId,
      target_name: customer.name,
      reason: data.reason,
    });

    return { ok: true };
  });
