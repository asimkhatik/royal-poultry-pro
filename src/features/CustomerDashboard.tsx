import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { inr, inrShort, kg, fmtDate } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { Crown, Download, Receipt, Scale, Wallet, Bird } from "lucide-react";
import { generateStatementPDF } from "@/lib/pdf";
import { LedgerTable, buildLedger } from "@/components/LedgerTable";
import { PayBillDialog } from "@/components/PayBillDialog";
import { StatCard } from "@/components/StatCard";
import { DayPickerControl } from "@/components/DayPicker";
import { format } from "date-fns";

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function CustomerDashboard() {
  const { customerId, profile, approvalStatus } = useAuth();
  const { t } = useT();
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const dateISO = toISO(selectedDate);
  const isToday = dateISO === toISO(new Date());

  const { data } = useQuery({
    queryKey: ["customer-self", customerId],
    enabled: !!customerId && approvalStatus === "approved",
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

  if (approvalStatus === "pending") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-gold/40 bg-card p-8 text-center shadow-gold">
        <Crown className="mx-auto size-10 text-gold" />
        <h2 className="mt-4 font-display text-xl font-bold">Awaiting Admin Approval</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Hi {profile?.full_name || "there"}, your account has been created and is pending review by the admin.
          You'll be able to view your ledger and balance once approved.
        </p>
      </div>
    );
  }

  if (approvalStatus === "rejected") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-destructive/50 bg-card p-8 text-center">
        <h2 className="font-display text-xl font-bold text-destructive">Registration Rejected</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account registration was not approved. Please contact ROYAL BROILER for assistance.
        </p>
      </div>
    );
  }

  const c = data?.customer;
  const allSales = data?.sales ?? [];
  const allPayments = data?.payments ?? [];

  const daySales = allSales.filter((s) => s.sale_date === dateISO);
  const dayPayments = allPayments.filter((p) => p.payment_date === dateISO);

  const dayWeight = daySales.reduce((a, s) => a + Number(s.weight_kg), 0);
  const dayQty = daySales.reduce((a, s) => a + Number(s.quantity_of_broilers ?? 0), 0);
  const dayTotal = daySales.reduce((a, s) => a + Number(s.total_amount), 0);
  const dayPaid = dayPayments.reduce((a, p) => a + Number(p.amount), 0);
  const dayRate = dayWeight > 0 ? dayTotal / dayWeight : 0;
  const dayBalance = Math.max(0, dayTotal - dayPaid);

  const balance = Number(c?.current_balance ?? 0);
  const rows = buildLedger(allSales, allPayments, {
    amount: Number(c?.opening_balance ?? 0),
    date: c?.opening_balance_date ?? null,
    notes: c?.opening_balance_notes ?? null,
  });

  const downloadStatement = async () => {
    if (!c) return;
    const pdf = await generateStatementPDF({
      customer: { name: c.name, phone: c.phone, address: c.address, id: c.id, status: c.status },
      rows,
      currentBalance: balance,
      openingBalance: Number(c.opening_balance ?? 0),
    });
    pdf.save(`statement-${c.name.replace(/\s+/g, "_")}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Crown className="size-7 text-gold" />
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">
              Welcome, {profile?.full_name || c?.name || "customer"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isToday ? "Today's activity" : format(selectedDate, "EEEE, dd MMM yyyy")}
            </p>
          </div>
        </div>
        <DayPickerControl value={selectedDate} onChange={setSelectedDate} />
      </div>

      {/* Outstanding (always current, cumulative) */}
      <Card className={balance > 0 ? "border-destructive/40" : "border-success/40"}>
        <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-[0.12em]">
              Current outstanding balance
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
            <p className="text-xs text-muted-foreground mt-1">
              Opening balance + all purchases − all payments
            </p>
          </div>
          {balance > 0 && <PayBillDialog balance={balance} customerName={c?.name} />}
        </CardContent>
      </Card>

      {/* Daily cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={isToday ? "Today's total" : "Purchase total"}
          value={dayTotal}
          format="currency"
          tone="revenue"
          icon={Receipt}
          highlight
        />
        <StatCard label="Weight" value={dayWeight} format="weight" tone="weight" icon={Scale} />
        <Card>
          <CardContent className="p-5">
            <div className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-[0.12em]">
              Broilers
            </div>
            <div className="mt-2 font-stat tabular-nums leading-none text-2xl sm:text-3xl flex items-center gap-2">
              <Bird className="size-6 text-primary" />
              {dayQty}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dayRate > 0 ? `Avg rate ${inr(dayRate)}/kg` : "—"}
            </p>
          </CardContent>
        </Card>
        <StatCard
          label={isToday ? "Paid today" : "Paid on date"}
          value={dayPaid}
          format="currency"
          tone="paid"
          icon={Wallet}
        />
      </div>

      {/* Day breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              {isToday ? "Today's purchases" : `Purchases on ${format(selectedDate, "dd MMM")}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {daySales.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm">
                      {kg(s.weight_kg)} @ {inr(s.rate_per_kg)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {s.quantity_of_broilers ? `${s.quantity_of_broilers} birds` : "—"}
                    </div>
                  </div>
                  <div className="font-semibold">{inr(s.total_amount)}</div>
                </div>
              ))}
              {!daySales.length && (
                <div className="px-4 py-6 text-sm text-muted-foreground">No purchases on this date</div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              {isToday ? "Today's payments" : `Payments on ${format(selectedDate, "dd MMM")}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {dayPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm">{fmtDate(p.payment_date)}</div>
                    <div className="text-xs text-muted-foreground">{p.payment_mode.toUpperCase()}</div>
                  </div>
                  <div className="font-semibold text-success">{inr(p.amount)}</div>
                </div>
              ))}
              {!dayPayments.length && (
                <div className="px-4 py-6 text-sm text-muted-foreground">No payments on this date</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full ledger (kept for downloads / history) */}
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
    </div>
  );
}
