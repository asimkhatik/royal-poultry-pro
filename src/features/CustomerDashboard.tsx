import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { inr, inrShort, kg, fmtDate } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { Crown, Download, Receipt, Wallet } from "lucide-react";
import { generateStatementPDF } from "@/lib/pdf";
import { LedgerTable, buildLedger } from "@/components/LedgerTable";
import { PayBillDialog } from "@/components/PayBillDialog";
import { StatCard } from "@/components/StatCard";

export function CustomerDashboard() {
  const { customerId, profile } = useAuth();
  const { t } = useT();

  const { data } = useQuery({
    queryKey: ["customer-self", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const [{ data: customer }, { data: sales }, { data: payments }] = await Promise.all([
        supabase.from("customers").select("*").eq("id", customerId!).maybeSingle(),
        supabase.from("sales").select("*").eq("customer_id", customerId!).order("sale_date", { ascending: true }),
        supabase.from("payments").select("*").eq("customer_id", customerId!).order("payment_date", { ascending: true }),
      ]);
      return { customer, sales: sales ?? [], payments: payments ?? [] };
    },
  });

  if (!customerId) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Your account isn't linked to a customer record yet. Please contact the admin.
        </p>
      </div>
    );
  }

  const c = data?.customer;
  const totalPurchase = (data?.sales ?? []).reduce((a, s) => a + Number(s.total_amount), 0);
  const totalPaid = (data?.payments ?? []).reduce((a, p) => a + Number(p.amount), 0);
  const balance = Number(c?.current_balance ?? 0);
  const rows = buildLedger(data?.sales ?? [], data?.payments ?? []);

  const downloadStatement = async () => {
    if (!c) return;
    const pdf = await generateStatementPDF({
      customer: { name: c.name, phone: c.phone, address: c.address },
      rows,
      currentBalance: balance,
    });
    pdf.save(`statement-${c.name.replace(/\s+/g, "_")}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Crown className="size-7 text-gold" />
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">
            Welcome, {profile?.full_name || c?.name || "customer"}
          </h1>
          <p className="text-sm text-muted-foreground">Your purchases, payments, and balance</p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card className={balance > 0 ? "border-destructive/40" : "border-success/40"}>
          <CardContent className="p-5 space-y-4">
            <div>
              <div className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-[0.12em]">
                {t("pending")}
              </div>
              <div
                className={`mt-2 font-stat tabular-nums leading-none text-3xl sm:text-4xl ${
                  balance > 0
                    ? "text-[oklch(0.55_0.20_25)] dark:text-[oklch(0.72_0.20_25)]"
                    : "text-[oklch(0.45_0.14_150)] dark:text-[oklch(0.78_0.16_150)]"
                }`}
              >
                {inrShort(balance)}
              </div>
            </div>
            {balance > 0 && <PayBillDialog balance={balance} customerName={c?.name} />}
          </CardContent>
        </Card>
        <StatCard label={t("totalPurchase")} value={totalPurchase} format="currency" tone="revenue" icon={Receipt} size="lg" />
        <StatCard label={t("totalPaid")} value={totalPaid} format="currency" tone="paid" icon={Wallet} size="lg" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold">{t("ledger")}</CardTitle>
          <Button size="sm" variant="outline" onClick={downloadStatement}>
            <Download className="size-4 mr-2" /> {t("download")}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <LedgerTable rows={rows} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Purchase history</CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-80 overflow-y-auto">
            <div className="divide-y divide-border">
              {(data?.sales ?? []).slice().reverse().map((s) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm">{fmtDate(s.sale_date)}</div>
                    <div className="text-xs text-muted-foreground">
                      {kg(s.weight_kg)} @ {inr(s.rate_per_kg)}
                    </div>
                  </div>
                  <div className="font-semibold">{inr(s.total_amount)}</div>
                </div>
              ))}
              {!data?.sales.length && <div className="px-4 py-6 text-sm text-muted-foreground">No purchases yet</div>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Payment history</CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-80 overflow-y-auto">
            <div className="divide-y divide-border">
              {(data?.payments ?? []).slice().reverse().map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm">{fmtDate(p.payment_date)}</div>
                    <div className="text-xs text-muted-foreground">{p.payment_mode.toUpperCase()}</div>
                  </div>
                  <div className="font-semibold text-success">{inr(p.amount)}</div>
                </div>
              ))}
              {!data?.payments.length && <div className="px-4 py-6 text-sm text-muted-foreground">No payments yet</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
